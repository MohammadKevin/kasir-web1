import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url, headers, method = 'GET', body } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL target tidak boleh kosong' }, { status: 400 })
    }

    // Set up standard headers and merge user headers
    const requestHeaders: HeadersInit = {}
    
    if (headers && typeof headers === 'object') {
      Object.entries(headers).forEach(([key, val]) => {
        if (val && typeof val === 'string') {
          // Normalize names
          requestHeaders[key] = val
        }
      })
    }

    // Default Content-Type if method is not GET and content type not specified
    if (method !== 'GET' && !requestHeaders['content-type'] && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json'
    }

    const options: RequestInit = {
      method,
      headers: requestHeaders,
    }

    if (method !== 'GET' && body) {
      options.body = typeof body === 'object' ? JSON.stringify(body) : body
    }

    const res = await fetch(url, options)
    
    // Get text response first to handle non-JSON or error messages
    const textData = await res.text()
    
    let jsonData
    try {
      jsonData = JSON.parse(textData)
    } catch {
      jsonData = null
    }

    if (!res.ok) {
      return NextResponse.json(
        { 
          error: `Gagal memanggil API Majoo: ${res.statusText}`, 
          status: res.status, 
          rawResponse: textData.substring(0, 1000) 
        }, 
        { status: res.status }
      )
    }

    return NextResponse.json(jsonData || { raw: textData })
  } catch (error: any) {
    console.error('Majoo proxy error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
