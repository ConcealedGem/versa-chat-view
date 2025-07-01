import { Chat } from '@/components/chat'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <Chat id="home" />
      </div>
    </main>
  )
}
