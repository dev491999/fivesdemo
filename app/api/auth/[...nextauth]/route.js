export const dynamic = 'force-dynamic'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'

const uri = process.env.MONGODB_URI

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' }
      },
      async authorize(credentials) {
        try {
          const client = new MongoClient(uri)
          await client.connect()
          const db = client.db()

          // Insert default users only if none exist
          const userCount = await db.collection('users').countDocuments()
          if (userCount === 0) {
            const defaultUsers = [
              { 
                email: 'raghawendra.joshi@enproindia.com', // CEO email
                password: await bcrypt.hash('password', 12), 
                role: 'ceo', 
                name: 'CEO', 
                username: 'ceo' 
              },
              { 
                email: 'rahulujoshi75@gmail.com', // User email
                password: await bcrypt.hash('password', 12), 
                role: 'user', 
                name: 'User', 
                username: 'user' 
              }
            ]

            // All zone managers use your specified email
            for (let i = 1; i <= 13; i++) {
              defaultUsers.push({
                email: 'rahulujoshi@rediffmail.com',
                password: await bcrypt.hash('password', 12),
                role: 'zone_manager',
                name: `Zone Manager ${i}`,
                username: `manager${i}`,
                assignedZone: i
              })
            }

            await db.collection('users').insertMany(defaultUsers)
          }

          const user = await db.collection('users').findOne({ email: credentials.email })
          await client.close()

          if (user) {
            const passwordMatch = await bcrypt.compare(credentials.password, user.password)
            const roleMatch = (credentials.role === user.role)
            if (passwordMatch && roleMatch) {
              return {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                assignedZone: user.assignedZone
              }
            }
          }

          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.assignedZone = user.assignedZone
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      session.user.assignedZone = token.assignedZone
      return session
    }
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
