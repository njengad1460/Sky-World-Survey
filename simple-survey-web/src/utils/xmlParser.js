import { parseStringPromise } from 'xml2js';

export const xmlToJson = async (xmlString) => {
  try {
    const parsed = await parseStringPromise(xmlString, {
      explicitArray: false,
      mergeAttrs: true,
      explicitRoot: false
    });
    return parsed;
  } catch (error) {
    console.error('XML parsing failure:', error);
    throw new Error('Failed to resolve structural database layout representation.', { cause: error });
  }
};

/**
 * Encapsulates basic JS structural data into basic raw XML payload blocks.
 */
export const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export const jsonToXml = (rootName, obj) => {
  let xml = `<${rootName}>`;
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null) {
      xml += `<${key}>${escapeXml(val)}</${key}>`;
    }
  }
  xml += `</${rootName}>`;
  return xml;
};
