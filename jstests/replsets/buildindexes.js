doTest = function( signal ) {

  var name = "buildIndexes";
  var host = getHostName();
  
  var replTest = new ReplSetTest( {name: name, nodes: 3} );

  var nodes = replTest.startSet();

  var config = replTest.getReplSetConfig();
  config.members[2].priority = 0;
  config.members[2].buildIndexes = false;
  
  replTest.initiate(config);

  var master = replTest.getMaster().getDB(name);
  var slaveConns = replTest.liveNodes.slaves;
  var slave = [];
  for (var i in slaveConns) {
    slaveConns[i].setSlaveOk();
    slave.push(slaveConns[i].getDB(name));
  }
      
  master.x.ensureIndex({y : 1});

  for (var i=0; i<100; i++) {
    master.x.insert({x:1,y:"abc",c:1});
  }

  replTest.awaitReplication();

  printjson(slave[0].runCommand({count: "x"}));
  var ns = master.x+"";
  print("namespace: "+ns);

  // can't query system.indexes from slave, so we'll look at coll.stats()
  var indexes = slave[0].stats().indexes;
  assert.eq(indexes, 2);

  indexes = slave[1].stats().indexes;
  assert.eq(indexes, 1);

  
  indexes = slave[0].x.stats().indexSizes;
  printjson(indexes);
  
  var count = 0;
  for (var i in indexes) {
    count++;
    if (i == "_id_") {
      continue;
    }
    print(i);
    print(i.match(/y_/));
    assert(i.match(/y_/));
  }

  assert.eq(count, 2);
  
  indexes = slave[1].x.stats().indexSizes;
  printjson(indexes);

  count = 0;
  for (var i in indexes) {
    count++;
  }  

  assert.eq(count, 1);

  replTest.stopSet(15);
}

doTest(15);
