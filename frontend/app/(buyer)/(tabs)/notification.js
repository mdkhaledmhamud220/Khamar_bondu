// app/(buyer)/(tabs)/notification.js
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import NotificationsScreen from '../../../components/NotificationsScreen';

export default function BuyerNotificationsTab() {
  const uid = getAuth().currentUser?.uid;

  return (
    <NotificationsScreen
      audience="buyer"
      ownerId={uid}
      onPressNotification={(n) => {
        if (n.type === 'chat' && n.data?.convId) {
          router.push(`/(buyer)/chat/${n.data.convId}`);
        } else if (n.type === 'order' && n.data?.orderId) {
          router.push(`/(buyer)/orders/${n.data.orderId}`);
        }
      }}
    />
  );
}