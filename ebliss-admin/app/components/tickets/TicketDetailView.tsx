// app/components/tickets/TicketDetailView.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowLeft,
  Send,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { Avatar, AvatarFallback } from '../ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useToast } from '../../../hooks/use-toast'
import { ticketApi, Ticket } from '../../lib/ticket-api'

// Define the message type based on API response
interface TicketMessage {
  id: number
  ticket_id: number
  user_id: number | null
  admin_id: number | null
  message: string
  attachments: string[] | null
  is_internal: boolean
  created_at: string
  user: {
    full_name: string
    email: string
  } | null
  admin: {
    email: string
  } | null
}

interface TicketDetailViewProps {
  ticket: Ticket
  onBack: () => void
  onUpdate: () => void
}

export function TicketDetailView({ ticket: initialTicket, onBack, onUpdate }: TicketDetailViewProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [sending, setSending] = useState(false)
  const [showInternalNote, setShowInternalNote] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchMessages()
  }, [ticket.id])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const data = await ticketApi.getTicket(ticket.id)
      setTicket(data)
      
      // Get messages from the ticket response
      const rawMessages = (data as any).messages || []
      
      // Combine with internal notes if any
      const internalNotes = (data as any).internalNotes || []
      
      // Transform internal notes to message format
      const formattedInternalNotes = internalNotes.map((note: any) => ({
        id: `note-${note.id}`,
        ticket_id: ticket.id,
        user_id: null,
        admin_id: note.admin_id,
        message: note.note,
        attachments: null,
        is_internal: true,
        created_at: note.created_at,
        user: null,
        admin: note.admin || { email: 'Admin' },
      }))
      
      // Combine and sort by date
      const allMessages = [...rawMessages, ...formattedInternalNotes].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      
      setMessages(allMessages)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load messages',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get author info from message
  const getAuthorInfo = (message: TicketMessage) => {
    // If it's an internal note
    if (message.is_internal) {
      return {
        name: message.admin?.email || 'Admin',
        type: 'admin' as const,
        initial: message.admin?.email?.[0]?.toUpperCase() || 'A',
      }
    }
    
    // If message has admin_id, it's from admin
    if (message.admin_id) {
      return {
        name: message.admin?.email || 'Admin Support',
        type: 'admin' as const,
        initial: message.admin?.email?.[0]?.toUpperCase() || 'A',
      }
    }
    
    // If message has user_id, it's from customer
    if (message.user_id) {
      return {
        name: message.user?.full_name || message.user?.email || 'Customer',
        type: 'customer' as const,
        initial: message.user?.full_name?.[0]?.toUpperCase() || message.user?.email?.[0]?.toUpperCase() || 'C',
      }
    }
    
    // Fallback
    return {
      name: 'System',
      type: 'admin' as const,
      initial: 'S',
    }
  }

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return
    
    setSending(true)
    try {
      await ticketApi.replyToTicket(ticket.id, replyMessage)
      toast({
        title: 'Success',
        description: 'Reply sent successfully',
      })
      setReplyMessage('')
      fetchMessages()
      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send reply',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleAddInternalNote = async () => {
    if (!internalNote.trim()) return
    
    setSending(true)
    try {
      await ticketApi.addInternalNote(ticket.id, internalNote)
      toast({
        title: 'Success',
        description: 'Internal note added',
      })
      setInternalNote('')
      setShowInternalNote(false)
      fetchMessages()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add note',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    try {
      const updated = await ticketApi.updateStatus(ticket.id, status)
      setTicket(updated)
      toast({
        title: 'Status Updated',
        description: `Ticket marked as ${status}`,
      })
      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-700 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      urgent: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      open: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle, label: 'Open' },
      in_progress: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, label: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Resolved' },
      closed: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle, label: 'Closed' },
    }
    return configs[status] || configs.open
  }

  const statusConfig = getStatusConfig(ticket.status)
  const StatusIcon = statusConfig.icon

  // Get customer info from ticket
  const customerName = (ticket as any).user?.full_name || ticket.user_name || 'Unknown'
  const customerEmail = (ticket as any).user?.email || ticket.user_email || 'No email'

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </button>

      {/* Ticket Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{ticket.subject}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={`${getPriorityColor(ticket.priority)} border`}>
                {ticket.priority.toUpperCase()}
              </Badge>
              <Badge className={`${statusConfig.color} border gap-1`}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
              <span className="text-sm text-gray-500 font-mono">
                {ticket.ticket_number || `#${ticket.id}`}
              </span>
              {ticket.sla_breached && (
                <Badge variant="destructive">SLA Breached</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Update Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[10000]">
              <DropdownMenuItem onClick={() => handleUpdateStatus('in_progress')}>
                <Clock className="h-4 w-4 mr-2 text-blue-600" />
                Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('resolved')}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Mark Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('closed')}>
                <XCircle className="h-4 w-4 mr-2 text-gray-600" />
                Close Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Ticket Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 mb-1">Customer</p>
            <p className="text-sm font-medium text-gray-900">{customerName}</p>
            <p className="text-xs text-blue-600">{customerEmail}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Department</p>
            <p className="text-sm text-gray-900 capitalize">{ticket.department || 'General'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Created</p>
            <p className="text-sm text-gray-900">
              {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Assigned To</p>
            <p className="text-sm text-gray-900">
              {ticket.assigned_to_name || 
               (ticket as any).assigned_to_admin?.email || 
               'Unassigned'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading messages...</p>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">Be the first to respond</p>
              </div>
            ) : (
              messages.map((message) => {
                const author = getAuthorInfo(message)
                const isAdmin = author.type === 'admin'
                const isInternal = message.is_internal
                
                return (
                  <div 
                    key={message.id} 
                    className={`flex ${isAdmin && !isInternal ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-2xl ${isInternal ? 'w-full' : ''}`}>
                      {/* Internal Note Label */}
                      {isInternal && (
                        <div className="mb-1 flex items-center gap-1">
                          <Shield className="h-3 w-3 text-orange-600" />
                          <span className="text-xs font-medium text-orange-600">Internal Note</span>
                        </div>
                      )}
                      
                      {/* Author Info */}
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={`text-xs ${
                            isAdmin 
                              ? isInternal ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {author.initial}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-900">
                          {author.name}
                          {isInternal && <span className="ml-1 text-xs text-orange-600">(Staff)</span>}
                        </span>
                        <span className="text-xs text-gray-400">
                          {message.created_at ? new Date(message.created_at).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      
                      {/* Message Content */}
                      <div className={`p-4 rounded-lg ${
                        isInternal 
                          ? 'bg-orange-50 border border-orange-200' 
                          : isAdmin 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200/20">
                            <p className="text-xs mb-2 opacity-75">Attachments:</p>
                            <div className="flex flex-wrap gap-2">
                              {message.attachments.map((file, idx) => (
                                <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded">
                                  📎 {file}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}
      </div>

      {/* Reply Box */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        {showInternalNote ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-orange-600">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Add Internal Note</span>
              <span className="text-xs text-orange-500">(Only visible to staff)</span>
            </div>
            <Textarea
              placeholder="Add a private note for your team..."
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={3}
              className="border-orange-200 focus:ring-orange-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowInternalNote(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleAddInternalNote}
                disabled={sending || !internalNote.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {sending ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Type your reply here..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setShowInternalNote(true)}>
                <Shield className="h-4 w-4 mr-2" />
                Internal Note
              </Button>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendReply}
                  disabled={sending || !replyMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}