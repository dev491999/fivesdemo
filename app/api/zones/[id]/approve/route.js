export const dynamic = 'force-dynamic'
import { MongoClient, ObjectId } from 'mongodb'
import nodemailer from 'nodemailer'

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
  // Add more zones and emails as needed
}

export async function POST(request, { params }) {
  try {
    const zoneId = parseInt(params.id)
    const { workId, approved, comment } = await request.json()

    const client = new MongoClient(uri)
    await client.connect()
    const db = client.db()

    const zone = await db.collection('zones').findOne({ id: zoneId })
    const workRecordIdx = zone.workRecords.findIndex(w => w._id.toString() === workId)
    const workRecord = zone.workRecords[workRecordIdx]

    if (!workRecord?.beforePhotos?.length || !workRecord?.afterPhotos?.length) {
      await client.close()
      return Response.json({ error: 'Cannot approve/reject work without both before and after photos.' }, { status: 400 })
    }

    const status = approved ? 'complete' : 'rejected'
    const updatePathStatus = `workRecords.${workRecordIdx}.status`
    const updatePathComment = `workRecords.${workRecordIdx}.approvalComment`
    const updatePathApprovedAt = `workRecords.${workRecordIdx}.approvedAt`

    await db.collection('zones').updateOne(
      { id: zoneId },
      {
        $set: {
          [updatePathStatus]: status,
          [updatePathComment]: comment,
          [updatePathApprovedAt]: new Date(),
          updatedAt: new Date()
        }
      }
    )

    if (approved) {
      await db.collection('completedWorks').insertOne({
        ...workRecord,
        zoneId,
        completedAt: new Date()
      })
    }

    try {
      const managerEmail = zoneManagerEmails[zoneId] || 'default_manager_email@example.com'

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: 'raghawendra.joshi@enproindia.com',
        subject: `Work ${approved ? 'Approved' : 'Rejected'} - Zone ${zoneId}`,
        html: `
          <h2>Work ${approved ? 'Approved' : 'Rejected'}</h2>
          <p><strong>Zone:</strong> ${zoneId}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Comment:</strong> ${comment || 'No comment provided'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        `
      })

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: managerEmail,
        subject: `Work ${approved ? 'Approved' : 'Rejected'} - Please Review`,
        html: `
          <h2>Work ${approved ? 'Approved' : 'Rejected'}</h2>
          <p>Your work in zone ${zoneId} has been ${status}.</p>
          <p><strong>Comment:</strong> ${comment || 'No comments provided'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        `
      })
    } catch (emailError) {
      console.error('Email notification failed:', emailError)
    }

    await client.close()
    return Response.json({ success: true, message: `Work ${approved ? 'approved' : 'rejected'} successfully` })
  } catch (error) {
    console.error('Error approving work:', error)
    return Response.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
