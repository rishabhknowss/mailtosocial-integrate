// app/interfaces/email.ts
import { ParsedEmailContent } from '../utils/emailParser';

export interface EmailImage {
  filename: string;
  mimeType: string;
  dataUrl: string;
  size?: number;
  attachmentId?: string;
  data?: string;
}

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
  internalDate: string;
  images?: EmailImage[];
  parsedContent?: Omit<ParsedEmailContent, 'mediaPositions'>;
}

export interface EmailsResponse {
  messages: Email[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    payload: {
        headers: { name: string; value: string }[];
        parts?: GmailMessagePart[];
        mimeType?: string;
        body?: {
            data?: string;
            size?: number;
            attachmentId?: string;
        };
    };
    internalDate: string;
}

export interface GmailMessagePart {
    mimeType?: string;
    filename?: string;
    body?: {
        data?: string;
        size?: number;
        attachmentId?: string;
    };
    parts?: GmailMessagePart[];
}

export interface GmailAttachment {
    filename: string;
    mimeType: string;
    attachmentId: string;
    size: number;
    data?: string;
    dataUrl?: string;
}

export interface EmailImage {
  filename: string;
  mimeType: string;
  dataUrl: string;
}

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
  internalDate: string;
  images?: EmailImage[];
}

export interface EmailsResponse {
  messages: Email[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface UrlContent {
  title: string;
  content: string;
  images: string[];
  url: string;
  description?: string;
  author?: string;
  date?: string;
}

export interface Post {
  id: string;
  content: string;
  platform: 'twitter' | 'linkedin';
  profileName?: string;
  username?: string;
  date: Date;
  variant: string;
  isEditing?: boolean;
  editedContent?: string;
  mediaUrl?: string;
  emailId?: string;
  urlSource?: UrlContent;
  generatedImage?: string;
  imageStyle?: 'illustration' | 'meme' | 'infographic';
}

export interface Account {
  connected: boolean;
}

export interface Product {
  product_id: string;
  name: string;
  description: string;
  price: number;
  is_recurring: boolean;
}