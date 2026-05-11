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

export const resolveIPFSUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return url;
};
