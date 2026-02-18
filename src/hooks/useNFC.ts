import { useEffect, useState, useCallback } from "react";

let nfcLib: typeof import("../lib/nfc") | null = null;

function loadNfcLib() {
  if (nfcLib) return nfcLib;
  try {
    nfcLib = require("../lib/nfc");
    return nfcLib;
  } catch {
    return null;
  }
}

export function useNFC() {
  const [supported, setSupported] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const lib = loadNfcLib();
    if (lib) {
      lib.initNfc().then(setSupported).catch(() => setSupported(false));
    }
  }, []);

  const scan = useCallback(async (): Promise<string | null> => {
    const lib = loadNfcLib();
    if (!lib || !lib.getNfcSupported()) return null;

    setScanning(true);
    try {
      const payload = await lib.readNfcTag();
      if (!payload) return null;
      return lib.extractLockIdFromUrl(payload);
    } finally {
      setScanning(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    const lib = loadNfcLib();
    if (lib) await lib.cancelNfcScan();
    setScanning(false);
  }, []);

  const writeTag = useCallback(async (lockId: string): Promise<boolean> => {
    const lib = loadNfcLib();
    if (!lib || !lib.getNfcSupported()) return false;
    return lib.writeNfcTag(lockId);
  }, []);

  return { supported, scanning, scan, cancel, writeTag };
}
