import { PrismaticLoader } from '../../components/PrismaticLoader';

export default function AdminLoading() {
  return (
    <PrismaticLoader
      label="ADMIN CONSOLE"
      sublabel="Authenticating session & loading workspace..."
      colors={["#A855F7", "#7C3AED", "#6366F1"]}
    />
  );
}
