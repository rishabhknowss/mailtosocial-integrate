// app/utils/emailParser.ts

/**
 * Defines a position of media URL in the email content
 */
export interface MediaPosition {
    url: string;
    startIndex: number;
    endIndex: number;
    type: 'image' | 'gif' | 'video';
  }
  
  /**
   * Represents structured content extracted from an email
   */
  export interface ParsedEmailContent {
    text: string[];
    urls: {
      social: string[];
      images: string[];
      gifs: string[];
      videos: string[];
      cta: string[];
      documents: string[];
      other: string[];
    };
    mediaPositions: MediaPosition[];
  }
  
  /**
   * Parses email content to extract text, media URLs, and other structured data
   * @param content Raw email content (HTML or plain text)
   * @returns Structured data extracted from the email content
   */
  export function parseEmailContent(content: string): ParsedEmailContent {
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const beehiivMediaRegex = /https:\/\/media\.beehiiv\.com\/[^\s)]+/g;
    
    // Track media positions
    const mediaPositions: MediaPosition[] = [];
    let match;
    
    // Find all beehiiv media URLs with their positions
    while ((match = beehiivMediaRegex.exec(content)) !== null) {
      const url = match[0];
      const type = url.match(/\.(gif|jpe?g|png|webp|mp4|mov|avi|webm)$/i)?.[1] || 'image';
      
      mediaPositions.push({
        url,
        startIndex: match.index,
        endIndex: match.index + url.length,
        type: type === 'gif' ? 'gif' : type.match(/mp4|mov|avi|webm/i) ? 'video' : 'image'
      });
    }
    
    // Find general image URLs
    const imgRegex = /<img.*?src=["'](https?:\/\/[^"']+)["'].*?>/gi;
    while ((match = imgRegex.exec(content)) !== null) {
      const url = match[1];
      if (!mediaPositions.some(pos => pos.url === url)) {
        const type = url.match(/\.(gif|jpe?g|png|webp)$/i)?.[1] || 'image';
        mediaPositions.push({
          url,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          type: type === 'gif' ? 'gif' : 'image'
        });
      }
    }
    
    // Sort media positions by their appearance in the text
    mediaPositions.sort((a, b) => a.startIndex - b.startIndex);
    
    // Clean up text content
    const cleanText = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/[-–—]/g, '')
      .replace(/[•●]/g, '')
      .replace(/\|\|/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    const lines = cleanText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);
      
    // Extract all URLs
    const urls = [];
    while ((match = urlRegex.exec(content)) !== null) {
      urls.push(match[0]);
    }
    
    // Categorize URLs with special handling for beehiiv media
    const categorizedUrls = {
      social: urls.filter(url => 
        url.includes('twitter.com') || 
        url.includes('linkedin.com') || 
        url.includes('facebook.com') ||
        url.includes('instagram.com')
      ),
      images: [
        ...mediaPositions.filter(pos => pos.type === 'image').map(pos => pos.url),
        ...urls.filter(url => 
          !url.includes('media.beehiiv.com') && 
          !mediaPositions.some(pos => pos.url === url) && // avoid duplicates
          url.match(/\.(jpg|jpeg|png|webp)$/i)
        )
      ],
      gifs: [
        ...mediaPositions.filter(pos => pos.type === 'gif').map(pos => pos.url),
        ...urls.filter(url => 
          !mediaPositions.some(pos => pos.url === url) && // avoid duplicates
          (url.match(/\.(gif)$/i) ||
          url.includes('giphy.com') ||
          url.includes('tenor.com'))
        )
      ],
      videos: [
        ...mediaPositions.filter(pos => pos.type === 'video').map(pos => pos.url),
        ...urls.filter(url => 
          !mediaPositions.some(pos => pos.url === url) && // avoid duplicates
          (url.match(/\.(mp4|mov|avi|webm)$/i) ||
          url.includes('youtube.com') ||
          url.includes('vimeo.com') ||
          url.includes('youtu.be'))
        )
      ],
      cta: urls.filter(url => 
        url.includes('/signup') ||
        url.includes('/register') ||
        url.includes('/buy') ||
        url.includes('/shop') ||
        url.includes('/order') ||
        url.includes('/demo') ||
        url.includes('/trial')
      ),
      documents: urls.filter(url => 
        url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)
      ),
      other: urls.filter(url => 
        !mediaPositions.some(pos => pos.url === url) &&
        !url.includes('media.beehiiv.com') &&
        !url.includes('twitter.com') && 
        !url.includes('linkedin.com') && 
        !url.includes('facebook.com') &&
        !url.includes('instagram.com') &&
        !url.match(/\.(jpg|jpeg|png|webp|gif|mp4|mov|avi|webm|pdf|doc|docx|xls|xlsx|ppt|pptx)$/i) &&
        !url.includes('giphy.com') &&
        !url.includes('tenor.com') &&
        !url.includes('youtube.com') &&
        !url.includes('vimeo.com') &&
        !url.includes('youtu.be') &&
        !url.includes('/signup') &&
        !url.includes('/register') &&
        !url.includes('/buy') &&
        !url.includes('/shop') &&
        !url.includes('/order') &&
        !url.includes('/demo') &&
        !url.includes('/trial')
      )
    };
    
    // Remove URLs from text content for cleaner display
    const textContent = lines.map(line => 
      line.replace(urlRegex, '').trim()
    ).filter(line => line);
    
    return {
      text: textContent,
      urls: categorizedUrls,
      mediaPositions
    };
  }
  
  /**
   * Converts a Gmail API email response to a parsed email content
   * including extracting images from dataUrls and inline content
   */
  export function convertGmailToStructuredEmail(email: { body?: string; snippet?: string; images?: { dataUrl: string; mimeType?: string }[] }): ParsedEmailContent {
      const parsedContent = parseEmailContent(email.body || email.snippet || '');
      
      // Process any image attachments from Gmail API
      if (email.images && email.images.length > 0) {
        // Add image URLs from Gmail API response
        email.images.forEach((image: { dataUrl: string; mimeType?: string }) => {
        if (image.dataUrl && !parsedContent.urls.images.includes(image.dataUrl)) {
          parsedContent.urls.images.push(image.dataUrl);
          
          // Add to media positions if not already there
          if (!parsedContent.mediaPositions.some(pos => pos.url === image.dataUrl)) {
            parsedContent.mediaPositions.push({
              url: image.dataUrl,
              startIndex: 0, // Since we don't know the position in the email body
              endIndex: 0,
              type: image.mimeType?.includes('gif') ? 'gif' : 'image'
            });
          }
        }
      });
    }
    
    return parsedContent;
  }