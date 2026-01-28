import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

function LogoSVG({ size = 200 }: { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F9A03F" />
          <stop offset="100%" stopColor="#F37021" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="32" fill="url(#logoGradient)" />
      <text 
        x="28" 
        y="118" 
        fill="white" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontSize="42" 
        fontWeight="700"
        letterSpacing="1"
      >
        ZECOH
      </text>
      <g transform="translate(152, 85)">
        <path 
          d="M 17 5 A 8 8 0 1 0 17 15" 
          stroke="white" 
          strokeWidth="4" 
          strokeLinecap="round"
          fill="none" 
        />
        <circle cx="10" cy="10" r="4" fill="white" />
      </g>
    </svg>
  );
}

function downloadSVG() {
  const svgContent = `<svg width="512" height="512" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F9A03F" />
      <stop offset="100%" stop-color="#F37021" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="32" fill="url(#logoGradient)" />
  <text x="28" y="118" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="700" letter-spacing="1">ZECOH</text>
  <g transform="translate(152, 85)">
    <path d="M 17 5 A 8 8 0 1 0 17 15" stroke="white" stroke-width="4" stroke-linecap="round" fill="none" />
    <circle cx="10" cy="10" r="4" fill="white" />
  </g>
</svg>`;
  
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zecoho-logo.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPNG(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#F9A03F');
  gradient.addColorStop(1, '#F37021');

  const radius = size * 0.16;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = `700 ${size * 0.21}px system-ui, -apple-system, sans-serif`;
  ctx.letterSpacing = '1px';
  ctx.fillText('ZECOH', size * 0.14, size * 0.59);

  const oX = size * 0.81;
  const oY = size * 0.475;
  const oRadius = size * 0.075;
  
  ctx.beginPath();
  ctx.arc(oX, oY, oRadius, -0.5 * Math.PI, 0.5 * Math.PI, true);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.02;
  ctx.lineCap = 'round';
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(oX, oY, oRadius, 0.5 * Math.PI, 1.5 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(oX, oY, size * 0.02, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zecoho-logo-${size}x${size}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export default function LogoGallery() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-2">ZECOHO Logo Download</h1>
        <p className="text-muted-foreground text-center mb-10">Download the official ZECOHO logo for social media and branding</p>
        
        <div className="flex justify-center mb-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Official ZECOHO Logo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="bg-white p-8 rounded-xl shadow-inner">
                <LogoSVG size={200} />
              </div>
              
              <div className="w-full space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Vector Format (SVG)</p>
                  <Button onClick={downloadSVG} className="w-full" data-testid="button-download-svg">
                    <Download className="h-4 w-4 mr-2" />
                    Download SVG
                  </Button>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">PNG Formats</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => downloadPNG(512)} data-testid="button-download-png-512">
                      <Download className="h-4 w-4 mr-2" />
                      512x512
                    </Button>
                    <Button variant="outline" onClick={() => downloadPNG(1024)} data-testid="button-download-png-1024">
                      <Download className="h-4 w-4 mr-2" />
                      1024x1024
                    </Button>
                    <Button variant="outline" onClick={() => downloadPNG(256)} data-testid="button-download-png-256">
                      <Download className="h-4 w-4 mr-2" />
                      256x256
                    </Button>
                    <Button variant="outline" onClick={() => downloadPNG(128)} data-testid="button-download-png-128">
                      <Download className="h-4 w-4 mr-2" />
                      128x128
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Recommended sizes for social media:</p>
          <ul className="mt-2 space-y-1">
            <li>Instagram/Facebook Profile: 512x512 or 1024x1024</li>
            <li>Twitter/X Profile: 512x512</li>
            <li>WhatsApp: 512x512</li>
            <li>LinkedIn: 512x512</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
