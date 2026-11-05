import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="container-page py-20">
      <EmptyState icon={Compass} title="Page not found" text="The page you are looking for does not exist." action={<Link to="/" className="btn-primary">Go home</Link>} />
    </div>
  );
}
