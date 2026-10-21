export interface TranslationResult {
  virtualAddress: number;
  pageSize: number;
  offsetBits: number;
  vpn: number;
  offset: number;
  vpnBinary: string;
  offsetBinary: string;
  virtualAddressBinary: string;
  virtualAddressHex: string;
  isHit: boolean;
  frameNumber: number | null;
  physicalAddress: number | null;
  physicalAddressHex: string | null;
  physicalAddressBinary: string | null;
  steps: {
    step: number;
    title: string;
    description: string;
  }[];
}

export function translateAddress(
  virtualAddress: number,
  pageSize: number,
  pageTable: { pageNumber: number; frameNumber: number | null; valid: boolean }[]
): TranslationResult {
  const offsetBits = Math.round(Math.log2(pageSize));
  const vpn = Math.floor(virtualAddress / pageSize);
  const offset = virtualAddress % pageSize;

  const vpnBinary = vpn.toString(2).padStart(8, '0');
  const offsetBinary = offset.toString(2).padStart(offsetBits, '0');
  const virtualAddressBinary = (vpnBinary + ' ' + offsetBinary).trim();
  const virtualAddressHex = '0x' + virtualAddress.toString(16).toUpperCase().padStart(4, '0');

  const ptEntry = pageTable.find((e) => e.pageNumber === vpn);
  const isHit = Boolean(ptEntry && ptEntry.valid && ptEntry.frameNumber !== null);
  const frameNumber = isHit && ptEntry ? ptEntry.frameNumber : null;

  let physicalAddress: number | null = null;
  let physicalAddressHex: string | null = null;
  let physicalAddressBinary: string | null = null;

  const steps = [
    {
      step: 1,
      title: 'Decompose Virtual Address into VPN and Offset',
      description: `With page size of ${pageSize} bytes (${offsetBits} offset bits), address ${virtualAddress} (${virtualAddressHex}) splits into Virtual Page Number (VPN) = ${vpn} (binary ${vpnBinary}) and Page Offset = ${offset} (binary ${offsetBinary}).`,
    },
  ];

  if (isHit && frameNumber !== null) {
    physicalAddress = frameNumber * pageSize + offset;
    physicalAddressHex = '0x' + physicalAddress.toString(16).toUpperCase().padStart(4, '0');
    const ppnBinary = frameNumber.toString(2).padStart(6, '0');
    physicalAddressBinary = `${ppnBinary} ${offsetBinary}`;

    steps.push({
      step: 2,
      title: `Page Table Lookup: Page ${vpn}`,
      description: `MMU indexed page table entry for Page ${vpn}. Valid bit is 1. Page is resident in Physical Frame ${frameNumber}.`,
    });

    steps.push({
      step: 3,
      title: 'Synthesize Physical Address',
      description: `Physical Frame Number (PFN) ${frameNumber} combined with identical Offset ${offset}: Physical Address = (${frameNumber} × ${pageSize}) + ${offset} = ${physicalAddress} (${physicalAddressHex}).`,
    });
  } else {
    steps.push({
      step: 2,
      title: `Page Table Lookup: Page ${vpn} is INVALID`,
      description: `MMU accessed Page Table for Page ${vpn}. Valid bit is 0 (page not in RAM). MMU generates a Page Fault Interrupt trap to OS kernel!`,
    });

    steps.push({
      step: 3,
      title: 'OS Page Fault Handler Invocation',
      description: `Kernel pauses process, selects a victim frame or free frame, schedules disk read to fetch Page ${vpn}, updates Page Table, and restarts instruction.`,
    });
  }

  return {
    virtualAddress,
    pageSize,
    offsetBits,
    vpn,
    offset,
    vpnBinary,
    offsetBinary,
    virtualAddressBinary,
    virtualAddressHex,
    isHit,
    frameNumber,
    physicalAddress,
    physicalAddressHex,
    physicalAddressBinary,
    steps,
  };
}
