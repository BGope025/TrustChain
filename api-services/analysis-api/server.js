const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const x402Middleware = require('./x402/middleware');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(x402Middleware);

app.use('/api', routes);

app.listen(PORT, () => {
    console.log('\n🚀 ' + 'analysis-api' + ' is running on port ' + PORT);
});
