import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

function App() {
  const [message, setMessage] = useState('')

  return (
    <div className="flex h-screen">
      {/* Chat Panel - 30% */}
      <div className="w-[30%] border-r flex flex-col">
        <ScrollArea className="flex-1 p-4">
          {/* Messages will go here */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Chat messages will appear here...</p>
          </div>
        </ScrollArea>
        
        {/* Chat Input Controls */}
        <div className="p-4 border-t flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your query..."
            className="flex-1"
          />
          <Button>Send</Button>
        </div>
      </div>

      {/* Viz Panel - 70% */}
      <div className="w-[70%] p-6">
        <h2 className="text-2xl font-bold mb-4">Visualization Panel</h2>
        <p className="text-muted-foreground">Visualizations will appear here...</p>
      </div>
    </div>
  )
}

export default App
