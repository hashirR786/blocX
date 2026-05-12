const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

export const uploadJSONToIPFS = async (jsonData: any): Promise<string> => {
  if (!PINATA_JWT || PINATA_JWT.includes("...")) {
    throw new Error("Pinata JWT is missing or invalid. Please add your real key to the .env file.");
  }

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PINATA_JWT}`
      },
      body: JSON.stringify({
        pinataContent: jsonData,
        pinataMetadata: {
          name: `BlocX_Data_${Date.now()}.json`
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.details || "Failed to upload to IPFS");
    }

    const data = await response.json();
    return `ipfs://${data.IpfsHash}`;
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    throw error;
  }
};

export const uploadFileToIPFS = async (file: File): Promise<string> => {
  if (!PINATA_JWT || PINATA_JWT.includes("...")) {
    throw new Error("Pinata JWT is missing or invalid. Please add your real key to the .env file.");
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const metadata = JSON.stringify({
      name: `BlocX_Media_${Date.now()}_${file.name}`,
    });
    formData.append("pinataMetadata", metadata);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.details || "Failed to upload file to IPFS");
    }

    const data = await response.json();
    return `ipfs://${data.IpfsHash}`;
  } catch (error) {
    console.error("IPFS File Upload Error:", error);
    throw error;
  }
};

// dweb.link first — most reliable across networks; Pinata/ipfs.io as fallbacks
const GATEWAYS = [
  'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
];

// Extract raw CID from any IPFS URL format
export function extractCID(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('ipfs://')) return url.slice(7);
  const match = url.match(/\/ipfs\/(.+)/);
  if (match) return match[1];
  if (url.startsWith('Qm') || url.startsWith('bafy')) return url;
  return null;
}

// Normalize any IPFS reference to use the primary gateway (dweb.link)
export const resolveIPFSUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const cid = extractCID(url);
  if (cid) return `${GATEWAYS[0]}${cid}`;
  return url;
};

// Fetch with automatic gateway fallback
export async function fetchIPFS(cidOrUrl: string): Promise<Response> {
  const cid = extractCID(cidOrUrl) ?? cidOrUrl;
  let lastError: Error = new Error('All IPFS gateways failed');
  for (const gw of GATEWAYS) {
    try {
      const res = await fetch(`${gw}${cid}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return res;
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError;
}
