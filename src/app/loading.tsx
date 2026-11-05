import { PrismaticLoader } from '../components/PrismaticLoader';

export default function Loading() {
  return (
    <PrismaticLoader
      label="LOADING PORTFOLIO"
      sublabel="Preparing interactive craft & experiences..."
      colors={["#A855F7", "#7C3AED", "#6366F1"]}
    />
  );
}

