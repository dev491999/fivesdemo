import { v2 as cloudinary } from "cloudinary"
export const dynamic = 'force-dynamic'

import { MongoClient, ObjectId } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import exifr from 'exifr'
import nodemailer from 'nodemailer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uri = process.env.MONGODB_URI

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const zoneManagerEmails = {
  1: 'rahulujoshi@rediffmail.com',
  2: 'spydarr1106@gmail.com',
  3: 'atharvaujoshi@gmail.com',
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const photo = formData.get('photo')
    const zoneId = parseInt(formData.get('zoneId'))
    const photoType = formData.get('photoType')
    const workType = formData.get('workType')
    const workIdStr = formData.get('workId')

    if (!photo || !zoneId || !photoType || !workType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (photoType === 'after' && !workIdStr) {
      return Response.json({ error: 'Work ID required for after photos' }, { status: 400 })
    }

    if (!photo.type.startsWith('image/')) {
      return Response.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (photo.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    const bytes = await photo.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let captureDate = new Date()
    try {
      const exifData = await exifr.parse(buffer)
      if (exifData?.DateTimeOriginal) {
        captureDate = new Date(exifData.DateTimeOriginal)
      }
    } catch {
      console.log('EXIF extraction failed, using current time')
    }

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `zones/${zoneId}/${photoType}`,
          resource_type: 'image',
          public_id: uuidv4(),
          overwrite: false,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    })

    const photoData = {
      _id: new ObjectId(),
      originalName: photo.name,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      timestamp: captureDate,
      size: photo.size,
      type: photo.type
    }

    const client = new MongoClient(uri)
    await client.connect()
    const db = client.db()

    let zone = await db.collection('zones').findOne({ id: zoneId })
    if (!zone) {
      zone = { id: zoneId, workRecords: [], createdAt: new Date() }
      await db.collection('zones').insertOne(zone)
    }

    if (photoType === 'before') {
      const newWork = {
        _id: new ObjectId(),
        workType,
        beforePhotos: [photoData],
        afterPhotos: [],
        status: 'inprogress',
        createdAt: new Date()
      }

      await db.collection('zones').updateOne(
        { id: zoneId },
        { $push: { workRecords: newWork }, $set: { updatedAt: new Date() } }
      )
    } else {
      const workId = new ObjectId(workIdStr)
      const workRecord = zone.workRecords.find(w => w._id.equals(workId))

      if (!workRecord) {
        await client.close()
        return Response.json({ error: 'Selected work not found' }, { status: 404 })
      }

      if (!workRecord.beforePhotos?.length) {
        await client.close()
        return Response.json({ error: 'Cannot upload after photo before before photos exist' }, { status: 400 })
      }

      await db.collection('zones').updateOne(
        { id: zoneId, 'workRecords._id': workId },
        {
          $push: { 'workRecords.$.afterPhotos': photoData },
          $set: { updatedAt: new Date() }
        }
      )
    }

    try {
      const managerEmail = zoneManagerEmails[zoneId] || 'default_manager_email@example.com'

      if (photoType === 'before') {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: managerEmail,
          subject: `Before Photo Uploaded - Zone ${zoneId}`,
          html: `<p>Work Type: ${workType}</p><p>Time: ${captureDate}</p>`
        })
      } else {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: 'raghawendra.joshi@enproindia.com',
          subject: `Work Ready for Approval - Zone ${zoneId}`,
          html: `<p>Work Type: ${workType}</p><p>Status: Ready for approval</p>`
        })
      }
    } catch (err) {
      console.error('Email failed:', err)
    }

    await client.close()

    return Response.json({
      success: true,
      photo: photoData
    })

  } catch (error) {
    console.error('Upload error:', error)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
