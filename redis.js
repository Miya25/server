const {redisClient} = require("./app");

module.exports = {

  connected: (uniqueID, _id, status, socketID) => {
    return multiWrapper(
      redisClient.multi()
      .hset(`user:${uniqueID}`, 'status', status)
      .hset(`user:${uniqueID}`, 'id', _id.toString())
      .hset(`user:${uniqueID}`, 'uniqueID', uniqueID)

      .hset(`connected:${socketID}`, 'u_id' , uniqueID)
      .hset(`connected:${socketID}`, '_id',  _id.toString())
      .sadd(`uniqueID:${uniqueID}`, socketID)
      
    )
  },
  getConnectedBySocketID: (socketID) => {
    return wrapper('hgetall',`connected:${socketID}`); 
  },
  connectedUserCount: async (uniqueID) => {
    await wrapper('scard', `uniqueID:${uniqueID}`);
  },
  disconnected: async (uniqueID, socketID) => {
    const response = await multiWrapper(
      redisClient.multi()
      .srem(`uniqueID:${uniqueID}`, socketID)
      .scard(`uniqueID:${uniqueID}`)
      .del(`connected:${socketID}`)
    );
    if(response.result[1] == 0) {
      return wrapper("del", `user:${uniqueID}`)
    } else {
      return response
    }
  },
  getPresences: async (array) => {
    const multi = redisClient.multi();
    for (let uniqueID of array) {
        multi.hmget(`user:${uniqueID}`, "uniqueID", "status")
    }
    return multiWrapper(multi) 
  },
  getPresence: async (uniqueID) => {
    return wrapper('hmget', `user:${uniqueID}`, 'uniqueID', 'status'); 
  },
  changeStatus: async (uniqueID, status) => {
    return wrapper('hset', `user:${uniqueID}`, 'status', status);
  },
  addChannel: async (channelID, channelData, uniqueID) => {
    if (channelData.server) {
      return wrapper('set', `channels:${channelID}`,JSON.stringify(channelData)); 
    } 
    return wrapper('hset', `user:${uniqueID}`, `channel:${channelID}`, JSON.stringify(channelData));
  },
  serverChannelExists: (channelID) => {
    return wrapper('exists', `channels:${channelID}`);
  },
  remServerChannels: (channelIDArr) => {
    const multi = redisClient.multi();
    for (let index = 0; index < channelIDArr.length; index++) {
      const channelID = channelIDArr[index];
      multi.del(`channels:${channelID}`)
    }
    return multiWrapper(multi) 
  },
  removeServerChannel: (channelID) => {
    return wrapper('del', `channels:${channelID}`); 
  },
  getChannel: (channelID, uniqueID) => {
    return wrapper('hget', `user:${uniqueID}`, `channel:${channelID}`);
  },
  getServerChannel: (channelID) => {
    return wrapper('get', `channels:${channelID}`);
  },
  addServerMember: (uniqueID, serverID) => {
    return wrapper('sadd', `serverMembers:${serverID}`, `user:${uniqueID}`);
  },
  serverMemberExists: (uniqueID, serverID) => {
    return wrapper('sismember', `serverMembers:${serverID}`, `user:${uniqueID}`);
  },
  remServerMember: (uniqueID, serverID) => {
    return wrapper('srem', `serverMembers:${serverID}`, `user:${uniqueID}`);
  },
  delServer: (serverID) => {
    return wrapper('del', `serverMembers:${serverID}`);
  },
  rateLimitSetExpire: async (key, expire, currentTTL) => {
    if (currentTTL === 1 || currentTTL === -1){
      const expiryMs = Math.round(1000 * expire);
      const test =  await wrapper('pexpire', `rateLimit:${key}`, expiryMs);
    }
    return;
  },
  rateLimitIncr: async (key) => {
    const response = await multiWrapper(
      redisClient.multi()
      .incr(`rateLimit:${key}`)
      .pttl(`rateLimit:${key}`)
    );
    if (!response.ok) return null;
    return response.result;
  }
}

function multiWrapper(multi) {
  return new Promise(resolve => {
    multi.exec((error, result) => {
      if (error) {
        return resolve({ok: false, error});
      }
      return resolve({ok: true, result});
    });
  })
}

function wrapper(method, ...args) {
  return new Promise(resolve => {
    redisClient[method](args, (error, result)=> {
      if (error) {
        return resolve({ok: false, error});
      }
      return resolve({ok: true, result});
    })
  });
}

  // emit status to friends.

  //const multi = redisClient.multi();
  // multi.hget(`user:${client.request.user.uniqueID}`, "status")
  // multi.hget(`user:${client.request.user.uniqueID}test`, "status")
  // multi.exec((err, res) => {
  //   console.log(res)
  // })
