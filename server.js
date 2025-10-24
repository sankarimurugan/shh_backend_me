const express = require('express');
const crypto = require('crypto'); 
const app = require('./app');
const PORT = process.env.PORT || 9099;

const key1 = crypto.randomBytes(32).toString('hex')
const key2 = crypto.randomBytes(32).toString('hex')
console.table({key1,key2})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
