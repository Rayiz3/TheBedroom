export function RoomAmbientLight({ intensity }: { intensity: number }) {
  return (
    <ambientLight
      name="Room_Ambient_Fill"
      color="#e4e0d8"
      intensity={intensity}
    />
  );
}
