import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

const ctx = require.context('/app');
function App() {
    return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
