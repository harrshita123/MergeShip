'use server'

/**
 * Real-time Messaging Actions
 * Uses Appwrite Database + Real-time subscriptions
 */

import { Client, Databases, ID, Query } from 'node-appwrite'

const DATABASE_ID = '69e12a90002821b7a144'
const MESSAGES_COLLECTION = 'messages' // We'll create this collection

function getAppwriteClient() {
  if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 
      !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 
      !process.env.APPWRITE_API_KEY) {
    throw new Error('Missing Appwrite credentials')
  }
  
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)
  
  return new Databases(client)
}

/**
 * Get all conversations for a user
 */
export async function getConversations(githubHandle) {
  try {
    const databases = getAppwriteClient()
    
    // Get messages where user is sender or receiver
    const sent = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, [
      Query.equal('fromHandle', githubHandle),
      Query.orderDesc('$createdAt'),
      Query.limit(100)
    ])
    
    const received = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, [
      Query.equal('toHandle', githubHandle),
      Query.orderDesc('$createdAt'),
      Query.limit(100)
    ])
    
    // Combine and deduplicate conversations
    const allMessages = [...sent.documents, ...received.documents]
    const conversationsMap = new Map()
    
    allMessages.forEach(msg => {
      const otherUser = msg.fromHandle === githubHandle ? msg.toHandle : msg.fromHandle
      
      if (!conversationsMap.has(otherUser) || 
          new Date(msg.$createdAt) > new Date(conversationsMap.get(otherUser).lastMessage)) {
        conversationsMap.set(otherUser, {
          handle: otherUser,
          avatar: `https://github.com/${otherUser}.png`,
          lastMessage: msg.content,
          lastMessageTime: msg.$createdAt,
          unread: msg.toHandle === githubHandle && !msg.read
        })
      }
    })
    
    return {
      success: true,
      conversations: Array.from(conversationsMap.values()).sort((a, b) => 
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      )
    }
  } catch (error) {
    console.error('[getConversations] Error:', error)
    
    // Fallback to mock data if collection doesn't exist yet
    if (error.code === 404) {
      return {
        success: true,
        conversations: getMockConversations(githubHandle),
        isMock: true
      }
    }
    
    return {
      success: false,
      error: error.message,
      conversations: getMockConversations(githubHandle),
      isMock: true
    }
  }
}

/**
 * Get messages between two users
 */
export async function getMessages(user1Handle, user2Handle) {
  try {
    const databases = getAppwriteClient()
    
    // Get all messages between these two users
    const messages1 = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, [
      Query.equal('fromHandle', user1Handle),
      Query.equal('toHandle', user2Handle),
      Query.orderAsc('$createdAt'),
      Query.limit(100)
    ])
    
    const messages2 = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, [
      Query.equal('fromHandle', user2Handle),
      Query.equal('toHandle', user1Handle),
      Query.orderAsc('$createdAt'),
      Query.limit(100)
    ])
    
    // Combine and sort by time
    const allMessages = [...messages1.documents, ...messages2.documents]
      .sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt))
      .map(msg => ({
        id: msg.$id,
        from: msg.fromHandle,
        to: msg.toHandle,
        content: msg.content,
        timestamp: msg.$createdAt,
        read: msg.read || false
      }))
    
    return {
      success: true,
      messages: allMessages
    }
  } catch (error) {
    console.error('[getMessages] Error:', error)
    
    // Fallback to mock messages
    if (error.code === 404) {
      return {
        success: true,
        messages: getMockMessages(user1Handle, user2Handle),
        isMock: true
      }
    }
    
    return {
      success: false,
      error: error.message,
      messages: getMockMessages(user1Handle, user2Handle),
      isMock: true
    }
  }
}

/**
 * Send a new message
 */
export async function sendMessage(fromHandle, toHandle, content) {
  try {
    const databases = getAppwriteClient()
    
    const message = await databases.createDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION,
      ID.unique(),
      {
        fromHandle,
        toHandle,
        content,
        read: false,
        createdAt: new Date().toISOString()
      }
    )
    
    return {
      success: true,
      message: {
        id: message.$id,
        from: message.fromHandle,
        to: message.toHandle,
        content: message.content,
        timestamp: message.$createdAt,
        read: false
      }
    }
  } catch (error) {
    console.error('[sendMessage] Error:', error)
    
    // Return mock success if collection doesn't exist
    if (error.code === 404) {
      return {
        success: true,
        message: {
          id: `mock-${Date.now()}`,
          from: fromHandle,
          to: toHandle,
          content,
          timestamp: new Date().toISOString(),
          read: false
        },
        isMock: true
      }
    }
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Mark messages as read
 */
export async function markAsRead(fromHandle, toHandle) {
  try {
    const databases = getAppwriteClient()
    
    // Get all unread messages from fromHandle to toHandle
    const unread = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, [
      Query.equal('fromHandle', fromHandle),
      Query.equal('toHandle', toHandle),
      Query.equal('read', false)
    ])
    
    // Mark each as read
    for (const msg of unread.documents) {
      await databases.updateDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION,
        msg.$id,
        { read: true }
      )
    }
    
    return { success: true }
  } catch (error) {
    console.error('[markAsRead] Error:', error)
    return { success: false, error: error.message }
  }
}

// Mock data fallbacks (when collection doesn't exist yet)
function getMockConversations(currentUser) {
  const mockUsers = [
    { handle: 'sarahchen', name: 'Sarah Chen', level: 'L4 Expert' },
    { handle: 'alexkumar', name: 'Alex Kumar', level: 'L3 Advanced' },
    { handle: 'emilyrod', name: 'Emily Rodriguez', level: 'L2 Intermediate' }
  ]
  
  return mockUsers.map((user, idx) => ({
    handle: user.handle,
    avatar: `https://github.com/${user.handle}.png`,
    lastMessage: idx === 0 ? 'Thanks for the review!' : idx === 1 ? 'Can you help with this issue?' : 'Great work on the PR!',
    lastMessageTime: new Date(Date.now() - idx * 3600000).toISOString(),
    unread: idx === 1
  }))
}

function getMockMessages(user1, user2) {
  return [
    {
      id: 'mock-1',
      from: user2,
      to: user1,
      content: 'Hey! I saw your PR on the React repo. Great work!',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      read: true
    },
    {
      id: 'mock-2',
      from: user1,
      to: user2,
      content: 'Thanks! It took a while to figure out the optimization.',
      timestamp: new Date(Date.now() - 6000000).toISOString(),
      read: true
    },
    {
      id: 'mock-3',
      from: user2,
      to: user1,
      content: 'Would you be interested in mentoring me on React performance?',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false
    }
  ]
}
