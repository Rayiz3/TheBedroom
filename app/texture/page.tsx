import { MaterialViewer } from '@/components/material-viewer';
import { ViewerNavigation } from '@/components/viewer-navigation';

export default function TextureViewPage() {
  return (
    <>
      <MaterialViewer />
      <ViewerNavigation currentView="Texture View" />
    </>
  );
}
