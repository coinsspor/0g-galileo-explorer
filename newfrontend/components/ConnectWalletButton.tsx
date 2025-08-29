'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function ConnectWalletButton() {
  return (
    <ConnectButton 
      label="Connect Wallet"
      showBalance={{
        smallScreen: false,
        largeScreen: true,
      }}
      chainStatus="icon"
      accountStatus={{
        smallScreen: 'avatar',
        largeScreen: 'full',
      }}
    />
  );
}
