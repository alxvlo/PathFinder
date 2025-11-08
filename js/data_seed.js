// Seed loader and guard rails
(async function seed(){
  PF.loadTopicsFromTxt('assets/topics/akinator_master_topics.txt');
  const ds = PF.load();
  PF.save(ds);
})();
