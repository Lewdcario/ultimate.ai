import app from './Server';
import Logger from './util/Logger';

app.listen(3000, () => {
	Logger.info('Server running on http://localhost:3000');
});
