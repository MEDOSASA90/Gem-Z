const net = require('net');

const PORT = 6379;
const store = new Map();
const zsets = new Map();

// Helper to format RESP types
function formatSimpleString(str) {
  return `+${str}\r\n`;
}

function formatError(err) {
  return `-${err}\r\n`;
}

function formatInteger(num) {
  return `:${num}\r\n`;
}

function formatBulkString(str) {
  if (str === null || str === undefined) {
    return '$-1\r\n';
  }
  const buf = Buffer.from(str, 'utf8');
  return `$${buf.length}\r\n${str}\r\n`;
}

function formatArray(arr) {
  if (arr === null || arr === undefined) {
    return '$-1\r\n';
  }
  let res = `*${arr.length}\r\n`;
  for (const item of arr) {
    if (item === null || item === undefined) {
      res += '$-1\r\n';
    } else {
      res += formatBulkString(String(item));
    }
  }
  return res;
}

const server = net.createServer((socket) => {
  socket.on('error', (err) => {
    // Suppress client disconnect errors
  });

  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    parseAndExecute();
  });

  function parseAndExecute() {
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer[offset] !== 42) { // '*' code in ASCII
        // Not an array / simple PING or something? Let's search for \r\n
        const lfIndex = buffer.indexOf('\r\n', offset);
        if (lfIndex === -1) break;
        const line = buffer.toString('utf8', offset, lfIndex).trim();
        offset = lfIndex + 2;
        if (line.toUpperCase() === 'PING') {
          socket.write(formatSimpleString('PONG'));
        }
        continue;
      }

      // It is an array command
      const lfIndex = buffer.indexOf('\r\n', offset);
      if (lfIndex === -1) break;
      const arraySizeStr = buffer.toString('utf8', offset + 1, lfIndex);
      const arraySize = parseInt(arraySizeStr, 10);
      if (isNaN(arraySize)) {
        socket.write(formatError('ERR protocol error'));
        buffer = Buffer.alloc(0);
        return;
      }

      let currentOffset = lfIndex + 2;
      const args = [];
      let incomplete = false;

      for (let i = 0; i < arraySize; i++) {
        if (currentOffset >= buffer.length || buffer[currentOffset] !== 36) { // '$' code
          incomplete = true;
          break;
        }
        const strLf = buffer.indexOf('\r\n', currentOffset);
        if (strLf === -1) {
          incomplete = true;
          break;
        }
        const strSizeStr = buffer.toString('utf8', currentOffset + 1, strLf);
        const strSize = parseInt(strSizeStr, 10);
        if (isNaN(strSize)) {
          incomplete = true;
          break;
        }
        currentOffset = strLf + 2;
        if (currentOffset + strSize + 2 > buffer.length) {
          incomplete = true;
          break;
        }
        const argVal = buffer.toString('utf8', currentOffset, currentOffset + strSize);
        args.push(argVal);
        currentOffset += strSize + 2;
      }

      if (incomplete) {
        break; // Wait for more data
      }

      offset = currentOffset;
      executeCommand(args);
    }

    if (offset > 0) {
      buffer = buffer.slice(offset);
    }
  }

  function executeCommand(args) {
    if (args.length === 0) return;
    const cmd = args[0].toUpperCase();

    if (cmd === 'PING') {
      socket.write(formatSimpleString('PONG'));
    } else if (cmd === 'SELECT') {
      socket.write(formatSimpleString('OK'));
    } else if (cmd === 'CLIENT') {
      socket.write(formatSimpleString('OK'));
    } else if (cmd === 'INFO') {
      socket.write(formatBulkString('# Server\r\nredis_version:7.0.0\r\n'));
    } else if (cmd === 'SET') {
      const key = args[1];
      const val = args[2];
      store.set(key, val);
      socket.write(formatSimpleString('OK'));
    } else if (cmd === 'SETEX') {
      const key = args[1];
      const seconds = parseInt(args[2], 10);
      const val = args[3];
      store.set(key, val);
      socket.write(formatSimpleString('OK'));
    } else if (cmd === 'GET') {
      const key = args[1];
      if (store.has(key)) {
        socket.write(formatBulkString(store.get(key)));
      } else {
        socket.write(formatBulkString(null));
      }
    } else if (cmd === 'DEL') {
      let count = 0;
      for (let i = 1; i < args.length; i++) {
        if (store.delete(args[i])) {
          count++;
        }
        if (zsets.delete(args[i])) {
          count++;
        }
      }
      socket.write(formatInteger(count));
    } else if (cmd === 'EXISTS') {
      const key = args[1];
      const exists = store.has(key) || zsets.has(key) ? 1 : 0;
      socket.write(formatInteger(exists));
    } else if (cmd === 'EXPIRE') {
      const key = args[1];
      const exists = store.has(key) || zsets.has(key) ? 1 : 0;
      socket.write(formatInteger(exists));
    } else if (cmd === 'ZADD') {
      const key = args[1];
      const score = parseFloat(args[2]);
      const val = args[3];
      if (!zsets.has(key)) {
        zsets.set(key, new Map());
      }
      const map = zsets.get(key);
      const isNew = !map.has(val);
      map.set(val, score);
      socket.write(formatInteger(isNew ? 1 : 0));
    } else if (cmd === 'ZRANGEBYSCORE') {
      const key = args[1];
      const min = parseFloat(args[2]);
      const max = parseFloat(args[3]);
      const map = zsets.get(key);
      if (!map) {
        socket.write(formatArray([]));
        return;
      }
      const results = [];
      for (const [val, score] of map.entries()) {
        if (score >= min && score <= max) {
          results.push(val);
        }
      }
      socket.write(formatArray(results));
    } else if (cmd === 'ZREM') {
      const key = args[1];
      const val = args[2];
      const map = zsets.get(key);
      if (map && map.delete(val)) {
        socket.write(formatInteger(1));
      } else {
        socket.write(formatInteger(0));
      }
    } else if (cmd === 'KEYS') {
      const pattern = args[1];
      const keys = [...store.keys(), ...zsets.keys()];
      socket.write(formatArray(keys));
    } else if (cmd === 'CUSTOM_DUMP') {
      // Return a JSON representation of the entire store
      const dump = {};
      for (const [k, v] of store.entries()) {
        dump[k] = v;
      }
      for (const [k, map] of zsets.entries()) {
        dump[k] = {};
        for (const [member, score] of map.entries()) {
          dump[k][member] = score;
        }
      }
      socket.write(formatBulkString(JSON.stringify(dump)));
    } else {
      socket.write(formatSimpleString('OK'));
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Redis Mock server running on port ${PORT}`);
});
