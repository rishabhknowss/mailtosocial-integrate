import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import * as cheerio from 'cheerio';

interface UrlContentResponse {
  title: string;
  content: string;
  images: string[];
  url: string;
  description?: string;
  author?: string;
  date?: string;
  cleanHtml?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the URL from the request body
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }
    
    // Validate the URL format
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(url);
      
      // Only allow http and https protocols for security
      if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
        throw new Error('Invalid URL protocol');
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    
    // Fetch the content from the URL
    const response = await fetch(url, {
      headers: {
        // Set a user-agent to avoid rejections from some servers
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch content: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'The URL does not point to a valid HTML page' },
        { status: 400 }
      );
    }
    
    // Get the HTML content
    const html = await response.text();
    
    // Parse the HTML content using cheerio
    const $ = cheerio.load(html);
    
    // Extract relevant information
    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    
    // Extract meta description
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || '';
    
    // Extract publication date
    const datePublished = $('meta[property="article:published_time"]').attr('content') ||
                        $('time').attr('datetime') || '';
    
    // Extract author
    const author = $('meta[name="author"]').attr('content') ||
                 $('meta[property="article:author"]').attr('content') ||
                 $('.author').first().text().trim() || '';
    
    // Create a clone of the document for clean HTML extraction
    const $html = cheerio.load(html);
    
    // Remove unwanted elements for clean HTML version
    $html('script, style, noscript, iframe, nav, header:not(h1, h2, h3, h4, h5, h6), footer, aside, .sidebar, .nav, .menu, .comments, .ad, .advertisement, form').remove();
    
    // Extract main content with HTML structure preserved
    let mainContentHtml = '';
    const contentSelectors = [
      'article', '.post-content', '.article-content', '.entry-content', 
      '.content', 'main', '#content', '.post', '.article', '.blog-post',
      '.post-body', '.story-body'
    ];
    
    for (const selector of contentSelectors) {
      const selectedContent = $html(selector).first();
      if (selectedContent.length && selectedContent.html()) {
        const contentHtml = selectedContent.html()?.trim();
        if (contentHtml && contentHtml.length > mainContentHtml.length) {
          mainContentHtml = contentHtml;
        }
      }
    }
    
    // If still no content found, take the body
    if (!mainContentHtml) {
      // Remove some basic unwanted elements from body
      mainContentHtml = $html('body').html()?.trim() || '';
    }
    
    // Clean the HTML for security
    let cleanHtml = mainContentHtml;
    
    // Clean external resources to avoid CORS issues
    cleanHtml = cleanHtml
      // Convert external links to target="_blank" with rel attributes
      .replace(/<a\s+(?:[^>]*?\s+)?href=(['"])(https?:\/\/[^'"]+)\1/gi, 
        '<a href="$2" target="_blank" rel="noopener noreferrer"')
      // Add loading="lazy" to images
      .replace(/<img\s+/gi, '<img loading="lazy" ');
    
    // Make relative URLs absolute
    cleanHtml = cleanHtml.replace(/(src|href)=(['"])(?!https?:\/\/)([^'"]+)\2/gi, (match, attr, quote, value) => {
      if (value.startsWith('/')) {
        // Absolute path
        const baseUrl = new URL(url).origin;
        return `${attr}=${quote}${baseUrl}${value}${quote}`;
      } else if (!value.startsWith('#') && !value.startsWith('data:') && !value.startsWith('javascript:')) {
        // Relative path (excluding anchors, data URLs, and javascript)
        return `${attr}=${quote}${new URL(value, url).href}${quote}`;
      }
      return match;
    });
    
    // Remove unwanted elements that typically contain non-content
    $('script, style, noscript, iframe, nav, header, footer, aside, .sidebar, .nav, .menu, .comments, .ad, .advertisement, form').remove();
    
    // Extract main content
    // First try common article content selectors
    let mainContent = '';
    
    for (const selector of contentSelectors) {
      const selectedContent = $(selector).first().text().trim();
      if (selectedContent && selectedContent.length > mainContent.length) {
        mainContent = selectedContent;
      }
    }
    
    // If still no content found, take the body
    if (!mainContent) {
      mainContent = $('body').text().trim();
    }
    
    // Clean up content
    // First clean any remaining HTML tags (if any text was scraped with tags)
    const tempDiv = cheerio.load(`<div>${mainContent}</div>`);
    mainContent = tempDiv('div').text();
    
    // Clean up content - remove excess whitespace
    mainContent = mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // Remove special characters that might make text unreadable
    mainContent = cleanText(mainContent);
    
    // Extract images
    const images: string[] = [];
    $('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src) {
        try {
          // For relative URLs, convert to absolute
          const absoluteUrl = new URL(src, url).href;
          
          // Skip tiny images, icons, and tracking pixels
          const width = parseInt($(img).attr('width') || '0', 10);
          const height = parseInt($(img).attr('height') || '0', 10);
          
          if ((width === 0 || width > 100) && (height === 0 || height > 100)) {
            if (!images.includes(absoluteUrl)) {
              // Avoid duplicate images
              images.push(absoluteUrl);
            }
          }
        } catch (e) {
          console.warn('Invalid image URL:', src, e);
        }
      }
    });
    
    // Construct response
    const result: UrlContentResponse = {
      title,
      content: mainContent,
      images,
      url,
      description,
      author,
      date: datePublished,
      cleanHtml
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching URL content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch or parse content' },
      { status: 500 }
    );
  }
}

/**
 * Cleans text by removing unwanted special characters and patterns
 * @param text The text to clean
 * @returns Cleaned text
 */
function cleanText(text: string): string {
  return text
    // Remove common special characters that aren't useful for reading
    .replace(/[^\w\s.,?!;:()"'-]/g, ' ')
    // Remove excessive punctuation
    .replace(/[.]{2,}/g, '...')
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    // Remove URLs that might have been left in the text
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove leftover HTML entities
    .replace(/&[a-z]+;/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Add proper spacing after punctuation if missing
    .replace(/([.,!?;:])\s*([A-Za-z])/g, '$1 $2')
    .trim();
} 