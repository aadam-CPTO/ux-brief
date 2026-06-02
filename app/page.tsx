import { redirect } from 'next/navigation'

// The app entry points are /admin and /brief/[sessionId].
// Send the bare root to the admin dashboard.
export default function Home() {
  redirect('/admin')
}
