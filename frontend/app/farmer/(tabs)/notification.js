// app/farmer/(tabs)/notification.js
import { router } from 'expo-router';
import NotificationsScreen from '../../../components/NotificationsScreen';
import { useFarm } from '../../../context/FarmContext';

export default function FarmerNotificationsTab() {
  const { selectedFarm } = useFarm(); // <-- ADJUST: use whatever FarmContext actually exposes
  const farmId = selectedFarm?.id;
  console.log("farm id: "+farmId);
  return (
    <NotificationsScreen
      audience="farm"
      ownerId={farmId}
      onPressNotification={(n) => {
        if (n.type === 'chat' && n.data?.convId) {
          router.push(`/farmer/chat/${n.data.convId}`);
        } else if (n.type === 'health') {
          router.push('/farmer/farm/health');
        } else if(n.type === 'booking'){
          router.push(`/farmer/farm/dashboard`);
        }
      }}
    />
  );
}