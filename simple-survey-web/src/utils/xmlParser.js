import { XMLParser } from 'fast-xml-parser';

export const xmlToJson = async (xmlString) => {
  try {
    const parser = new XMLParser({
      ignoreDeclaration: true,
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "_",
      parseAttributeValue: false,
      parseTagValue: false
    });
    
    let parsed = parser.parse(xmlString);
    if (parsed) {
      const keys = Object.keys(parsed);
      if (keys.length === 1 && typeof parsed[keys[0]] === 'object') {
        parsed = parsed[keys[0]];
      } else if (keys.length === 1 && parsed[keys[0]] === "") {
        parsed = {};
      }
    }
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
