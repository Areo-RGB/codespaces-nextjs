import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface VideoFile {
  key: string;
  url: string;
  title: string;
  size: number;
  lastModified: string;
}

// Create AWS Signature Version 4
function createSignedRequest(method: string, url: string, region: string, service: string) {
  const accessKey = process.env.SPACES_KEY!;
  const secretKey = process.env.SPACES_SECRET!;
  
  const urlObj = new URL(url);
  const host = urlObj.host;
  const pathname = urlObj.pathname;
  const querystring = urlObj.search.slice(1);
  
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const date = timestamp.substr(0, 8);
  
  // Create canonical request
  const canonicalHeaders = `host:${host}\nx-amz-date:${timestamp}\n`;
  const signedHeaders = 'host;x-amz-date';
  const canonicalRequest = `${method}\n${pathname}\n${querystring}\n${canonicalHeaders}\n${signedHeaders}\n${crypto.createHash('sha256').update('').digest('hex')}`;
  
  // Create string to sign
  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
  
  // Calculate signature
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(date).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  
  // Create authorization header
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    'x-amz-date': timestamp,
    'authorization': authorization,
    'host': host
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (!process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
      return res.status(500).json({ error: 'Missing credentials' });
    }

    // Try to list bucket contents using S3 API
    const bucketUrl = 'https://data4.fra1.digitaloceanspaces.com/';
    const headers = createSignedRequest('GET', bucketUrl, 'fra1', 's3');
    
    const response = await fetch(bucketUrl, {
      method: 'GET',
      headers: headers,
    });

    let videos: VideoFile[] = [];
    
    if (response.ok) {
      const xmlText = await response.text();
      console.log('Raw response:', xmlText.substring(0, 500)); // Log first 500 chars
      
      // Parse XML response to extract video files
      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
      const keyRegex = /<Key>([^<]+)<\/Key>/g;
      const sizeRegex = /<Size>([^<]+)<\/Size>/g;
      const lastModifiedRegex = /<LastModified>([^<]+)<\/LastModified>/g;
      
      let keyMatch;
      const keys: string[] = [];
      while ((keyMatch = keyRegex.exec(xmlText)) !== null) {
        keys.push(keyMatch[1]);
      }
      
      // Filter for video files in UE folder only
      const videoKeys = keys.filter(key => 
        key.startsWith('ue/') && videoExtensions.some(ext => key.toLowerCase().endsWith(ext))
      );
      
      for (const key of videoKeys) {
        const fileName = key.split('/').pop() || key;
        const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);
        
        videos.push({
          key,
          url: `https://data4.fra1.cdn.digitaloceanspaces.com/${key}`,
          title: formattedTitle,
          size: 0, // We could parse this from XML if needed
          lastModified: new Date().toISOString(),
        });
      }
    } else {
      console.log('API request failed, falling back to known videos');
      // Load only UE folder videos
      const knownVideos = [
        'ue/ue1.mp4',
        'ue/ue2.mp4',
        'ue/ue3.mp4',
        'ue/ue4.mp4',
        'ue/ue5.mp4',
      ];

      for (const videoPath of knownVideos) {
        const url = `https://data4.fra1.cdn.digitaloceanspaces.com/${videoPath}`;
        
        try {
          const testResponse = await fetch(url, { method: 'HEAD' });
          
          if (testResponse.ok) {
            const fileName = videoPath.split('/').pop() || videoPath;
            const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);
            
            videos.push({
              key: videoPath,
              url: url,
              title: formattedTitle,
              size: parseInt(testResponse.headers.get('content-length') || '0'),
              lastModified: testResponse.headers.get('last-modified') || new Date().toISOString(),
            });
          }
        } catch (error) {
          console.log(`File ${videoPath} not accessible:`, error);
        }
      }
    }

    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
}