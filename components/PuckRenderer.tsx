'use client';

import { Render, type Data } from '@measured/puck';
import { puckConfig } from '@/lib/puckConfig';

export default function PuckRenderer({ data }: { data: Data }) {
  return <Render config={puckConfig} data={data} />;
}
