declare module 'lucide-react' {
  import type { ComponentType, SVGProps } from 'react';

  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  };

  export const MapPin: ComponentType<LucideProps>;
}
