export const dynamic = 'force-dynamic'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI

export async function GET(request, { params }) {
  try {
    const zoneId = parseInt(params.id)

    const client = new MongoClient(uri)
    await client.connect()
    const db = client.db()

    let zone = await db.collection('zones').findOne({ id: zoneId })

    // Create zone if it doesn't exist
    if (!zone) {
      zone = {
        id: zoneId,
        workRecords: [],
        createdAt: new Date()
      }
      await db.collection('zones').insertOne(zone)
    }

    await client.close()

    return Response.json(zone)
  } catch (error) {
    console.error('Error fetching zone:', error)
    return Response.json({ error: 'Failed to fetch zone' }, { status: 500 })
  }
}
