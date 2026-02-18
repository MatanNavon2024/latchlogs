import { Platform } from "react-native";

let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;
let isNfcSupported = false;
let nfcLoadAttempted = false;

function loadNfcModule(): boolean {
  if (nfcLoadAttempted) return NfcManager !== null;
  nfcLoadAttempted = true;

  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;

  try {
    const nfcModule = require("react-native-nfc-manager");
    NfcManager = nfcModule.default;
    NfcTech = nfcModule.NfcTech;
    Ndef = nfcModule.Ndef;
    return true;
  } catch {
    return false;
  }
}

export async function initNfc(): Promise<boolean> {
  try {
    if (!loadNfcModule()) return false;

    const supported = await NfcManager.isSupported();
    if (supported) {
      await NfcManager.start();
      isNfcSupported = true;
    }
    return supported;
  } catch {
    return false;
  }
}

export function getNfcSupported(): boolean {
  return isNfcSupported;
}

export async function readNfcTag(): Promise<string | null> {
  if (!NfcManager) return null;
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();

    if (!tag?.ndefMessage?.length) {
      return null;
    }

    const record = tag.ndefMessage[0];
    const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));
    return payload;
  } catch {
    return null;
  } finally {
    NfcManager?.cancelTechnologyRequest?.().catch(() => {});
  }
}

export function extractLockIdFromUrl(url: string): string | null {
  const match = url.match(/\/clip\/([a-f0-9-]+)/i);
  return match?.[1] ?? null;
}

export async function cancelNfcScan(): Promise<void> {
  try {
    await NfcManager?.cancelTechnologyRequest?.();
  } catch {
    // Ignore
  }
}

export async function writeNfcTag(lockId: string): Promise<boolean> {
  if (!NfcManager || !Ndef) return false;
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;

  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const url = `https://latchlog.app/clip/${lockId}`;
    const bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);

    if (bytes) {
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    NfcManager?.cancelTechnologyRequest?.().catch(() => {});
  }
}
