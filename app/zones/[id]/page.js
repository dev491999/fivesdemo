'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import moment from 'moment'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function ZonePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const zoneId = params.id

  const [zoneData, setZoneData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedWorkType, setSelectedWorkType] = useState('WPP')
  const [photoType, setPhotoType] = useState('before')
  const [selectedWorkId, setSelectedWorkId] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [approvalComment, setApprovalComment] = useState('')
  const combinedRef = useRef(null)

  useEffect(() => {
    if (session?.user?.role === 'zone_manager' && session?.user?.assignedZone !== parseInt(zoneId)) {
      router.push('/')
      return
    }
    fetchZoneData()
  }, [zoneId, session])

  const fetchZoneData = async () => {
    try {
      const response = await fetch(`/api/zones/${zoneId}`)
      const data = await response.json()
      setZoneData(data)
    } catch (error) {
      setError('Failed to load zone data')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
        setError('')
      } else {
        setError('Please select a valid image file')
      }
    }
  }

  const uploadPhoto = async () => {
    if (!selectedFile) {
      setError('Please select a photo first')
      return
    }

    if (photoType === 'after' && !selectedWorkId) {
      setError('Please select a work record for the after photo')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('photo', selectedFile)
    formData.append('zoneId', zoneId)
    formData.append('photoType', photoType)
    formData.append('workType', selectedWorkType)
    if (photoType === 'after') {
      formData.append('workId', selectedWorkId)
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      
      if (response.ok) {
        setSuccess(`${photoType.charAt(0).toUpperCase() + photoType.slice(1)} photo uploaded successfully!`)
        setSelectedFile(null)
        setPreviewUrl(null)
        setSelectedWorkId('')
        setShowUploadForm(false)
        fetchZoneData()
      } else {
        setError(result.error || 'Upload failed')
      }
    } catch (error) {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const approveWork = async (workId, approved) => {
    try {
      const response = await fetch(`/api/zones/${zoneId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workId,
          approved,
          comment: approvalComment,
        }),
      })

      if (response.ok) {
        setSuccess(`Work ${approved ? 'approved' : 'rejected'} successfully!`)
        setApprovalComment('')
        fetchZoneData()
      } else {
        setError('Failed to process approval')
      }
    } catch (error) {
      setError('Approval failed')
    }
  }

  const deleteAfterPhoto = async (workId, photoId) => {
    try {
      const response = await fetch(`/api/work/${workId}/after-photo/${photoId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('After photo deleted successfully!')
        fetchZoneData()
      } else {
        setError('Failed to delete photo')
      }
    } catch (error) {
      setError('Delete failed')
    }
  }

  const downloadCombined = async (format) => {
    if (!combinedRef.current) return

    try {
      const canvas = await html2canvas(combinedRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2
      })

      if (format === 'pdf') {
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        })
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, canvas.width, canvas.height)
        pdf.save(`zone_${zoneId}_documentation.pdf`)
      } else {
        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/jpeg', 0.95)
        link.download = `zone_${zoneId}_documentation.${format}`
        link.click()
      }

      setSuccess(`Documentation downloaded as ${format.toUpperCase()}!`)
    } catch (error) {
      setError('Download failed')
    }
  }

  if (loading) return <div className="loading">Loading zone data...</div>

  const workRecords = zoneData?.workRecords || []
  const canUpload = session?.user?.role === 'user' || session?.user?.role === 'zone_manager'
  const canApprove = session?.user?.role === 'ceo'

  // Get available works for after photo selection
  const availableWorks = workRecords.filter(w => 
    w.beforePhotos?.length > 0 && 
    w.status !== 'complete' && 
    w.workType === selectedWorkType
  )

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <h1>Zone {zoneId} Details</h1>
          <div className="user-info">
            {session?.user?.role === 'zone_manager' ? (
              <button className="btn btn-secondary" onClick={() => signOut()}>
                Logout
              </button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => router.push('/')}>
                  ← Back to Dashboard
                </button>
                <button className="btn btn-secondary" onClick={() => signOut()}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="main-content">
        <div className="dashboard">
          {error && <div className="notification error">{error}</div>}
          {success && <div className="notification success">{success}</div>}

          {/* Upload Form */}
          {canUpload && (
            <div className="upload-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Upload Photos</h3>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowUploadForm(!showUploadForm)}
                >
                  {showUploadForm ? 'Cancel' : 'New Upload'}
                </button>
              </div>

              {showUploadForm && (
                <div className="upload-form">
                  <div className="work-type-selector">
                    {['WPP', 'WFP', 'FPP'].map(type => (
                      <div 
                        key={type}
                        className={`type-option ${selectedWorkType === type ? 'selected' : ''}`}
                        onClick={() => setSelectedWorkType(type)}
                      >
                        {type}
                      </div>
                    ))}
                  </div>

                  <div className="photo-type-selector">
                    <button
                      className={`photo-type-btn ${photoType === 'before' ? 'active' : ''}`}
                      onClick={() => setPhotoType('before')}
                    >
                      Before Photo
                    </button>
                    <button
                      className={`photo-type-btn ${photoType === 'after' ? 'active' : ''}`}
                      onClick={() => setPhotoType('after')}
                    >
                      After Photo
                    </button>
                  </div>

                  {photoType === 'after' && (
                    <div className="work-selector">
                      <label>Select Work Record:</label>
                      <select
                        value={selectedWorkId}
                        onChange={(e) => setSelectedWorkId(e.target.value)}
                        required
                      >
                        <option value="">Select a work record...</option>
                        {availableWorks.map((work) => (
                          <option key={work._id} value={work._id}>
                            {work.workType} - ID: {work._id.slice(-8)} ({work.beforePhotos.length} before photos)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    type="file"
                    id="photo-input"
                    className="file-input"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="photo-input" className="file-input-label">
                    Choose Photo
                  </label>

                  {previewUrl && (
                    <div className="preview-section">
                      <h4>Preview</h4>
                      <img src={previewUrl} alt="Preview" className="preview-img" />
                      <div style={{ marginTop: '15px' }}>
                        <button 
                          className="btn btn-primary" 
                          onClick={uploadPhoto}
                          disabled={uploading}
                        >
                          {uploading ? 'Uploading...' : `Upload ${photoType} Photo`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Work Records */}
          <div className="work-records">
            <h3>Work Records ({workRecords.length})</h3>
            
            {workRecords.map((work, index) => (
              <div key={work._id || index} className="work-record">
                <div className="work-header">
                  <div className="work-type">{work.workType}</div>
                  <div className="work-id">ID: {work._id}</div>
                  <div className={`status-indicator ${work.status === 'complete' ? 'status-complete' : work.status === 'rejected' ? 'status-rejected' : 'status-inprogress'}`}>
                    {work.status}
                  </div>
                </div>

                <div className="work-photos" ref={work.status === 'complete' ? combinedRef : null}>
                  <div className="photo-section">
                    <h4>Before Photos</h4>
                    <div className="photo-grid">
                      {work.beforePhotos?.map((photo, i) => (
                        <div key={i} className="photo-item">
                          <img 
                            src={photo.url} 
                            alt={`Before ${i + 1}`} 
                            className="photo-img"
                          />
                          <div className="photo-timestamp">
                            {moment(photo.timestamp).format('MM/DD/YY HH:mm')}
                          </div>
                        </div>
                      )) || <div>No before photos</div>}
                    </div>
                  </div>

                  <div className="photo-section">
                    <h4>After Photos</h4>
                    <div className="photo-grid">
                      {work.afterPhotos?.map((photo, i) => (
                        <div key={i} className="photo-item">
                          <img 
                            src={photo.url} 
                            alt={`After ${i + 1}`} 
                            className="photo-img"
                          />
                          <div className="photo-timestamp">
                            {moment(photo.timestamp).format('MM/DD/YY HH:mm')}
                          </div>
                          {work.status === 'rejected' && canUpload && (
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => deleteAfterPhoto(work._id, photo._id)}
                              style={{ fontSize: '0.8rem', padding: '5px 10px', marginTop: '5px' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )) || <div>No after photos</div>}
                    </div>
                  </div>
                </div>

                {/* CEO Approval Actions */}
                {canApprove && work.beforePhotos?.length > 0 && work.afterPhotos?.length > 0 && work.status === 'inprogress' && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>CEO Approval</h4>
                    <textarea
                      className="approval-comment"
                      placeholder="Add approval comment..."
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                    />
                    <div className="approval-actions">
                      <button 
                        className="btn btn-success"
                        onClick={() => approveWork(work._id, true)}
                      >
                        Approve Work
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => approveWork(work._id, false)}
                      >
                        Reject Work
                      </button>
                    </div>
                  </div>
                )}

                {/* Download Options for Complete Work */}
                {work.status === 'complete' && (
                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <h4>Download Documentation</h4>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button className="btn btn-primary" onClick={() => downloadCombined('jpg')}>
                        Download JPG
                      </button>
                      <button className="btn btn-primary" onClick={() => downloadCombined('png')}>
                        Download PNG
                      </button>
                      <button className="btn btn-success" onClick={() => downloadCombined('pdf')}>
                        Download PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {workRecords.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px', color: '#7f8c8d' }}>
                <h4>No work records found</h4>
                <p>Upload photos to create work records for this zone.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
