import 'dotenv/config';
import app from './app.js';
import { connect } from './db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connect();
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
