// 迎賓系統：Google 試算表後端。工作人員代碼不放入 GitHub。
const DATABASE_ID = '1jG7EhXMYiqR9RBset_G9irKdOvrkGAgv3Ej-6OYu924';
const EVENT_HEADERS=['活動ID','活動名稱','主辦單位','日期','職稱JSON','手動排序','版本','首頁圖片'];
const GUEST_HEADERS=['貴賓ID','活動ID','姓名','職稱','服務單位','報到時間','已介紹','順序'];
function setup(){
  const db=SpreadsheetApp.openById(DATABASE_ID);
  [['活動',EVENT_HEADERS],['貴賓',GUEST_HEADERS],['圖片',['圖片ID','分段序號','內容']]].forEach(function(pair){
    const s=db.getSheetByName(pair[0])||db.insertSheet(pair[0]);
    if(s.getLastRow()===0)s.appendRow(pair[1]);
    s.setFrozenRows(1);
    s.getRange(1,1,1,pair[1].length).setBackground('#174f42').setFontColor('#ffffff').setFontWeight('bold');
  });
  db.setSpreadsheetTimeZone('Asia/Taipei');
  const props=PropertiesService.getScriptProperties();
  let token=props.getProperty('STAFF_TOKEN');
  if(!token){token=Utilities.getUuid().replace(/-/g,'');props.setProperty('STAFF_TOKEN',token);}
  const settings=db.getSheetByName('設定')||db.insertSheet('設定');
  settings.getRange('A1:B4').setValues([['項目','內容'],['工作人員代碼',token],['說明','請只分享給報到人員及司儀，勿放到公開程式碼。'],['資料庫版本','2.0']]);
  settings.getRange('A1:B1').setBackground('#174f42').setFontColor('#ffffff').setFontWeight('bold');
  settings.setColumnWidth(1,180);settings.setColumnWidth(2,480);
  console.log('初始化完成。請在試算表「設定」工作表讀取工作人員代碼。');
}
function doGet(){return output_({ok:true,service:'迎賓系統',version:'2.0'});}
function doPost(e){
  let lock;
  try{
    const raw=e&&e.postData&&e.postData.contents||'';
    if(raw.length>800000)throw Error('資料太大，請縮小圖片後重試');
    const b=JSON.parse(raw);
    const token=PropertiesService.getScriptProperties().getProperty('STAFF_TOKEN');
    if(!token||typeof b.token!=='string'||b.token!==token)throw Error('工作人員代碼不正確，請檢查資料庫連線設定');
    lock=LockService.getScriptLock();
    if(!lock.tryLock(20000))throw Error('其他人員正在更新資料，請稍後重試');
    return output_(handle_(SpreadsheetApp.openById(DATABASE_ID),b));
  }catch(err){return output_({error:err.message||'儲存失敗，請稍後重試'});}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
function output_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
function rows_(sheet){const n=sheet.getLastRow();return n<2?[]:sheet.getRange(2,1,n-1,sheet.getLastColumn()).getValues();}
function text_(v,n){return typeof v==='string'?v.trim().slice(0,n||120):'';}
function safe_(v){return typeof v==='string'&&/^[=+@\-]/.test(v)?"'"+v:v;}
function saveRow_(sheet,index,row){sheet.getRange(index+2,1,1,row.length).setValues([row.map(safe_)]);}
function append_(sheet,row){sheet.getRange(sheet.getLastRow()+1,1,1,row.length).setValues([row.map(safe_)]);}
function event_(r){return {id:String(r[0]),name:String(r[1]),organization:String(r[2]),date:r[3] instanceof Date?Utilities.formatDate(r[3],'Asia/Taipei','yyyy-MM-dd'):String(r[3]),roles:JSON.parse(r[4]),manual:Number(r[5]),version:Number(r[6]),imageId:String(r[7]||'')};}
function guest_(r){return {id:String(r[0]),event_id:String(r[1]),name:String(r[2]),role:String(r[3]),unit:String(r[4]),arrived:r[5] instanceof Date?r[5].toISOString():String(r[5]),introduced:Number(r[6]),position:Number(r[7])};}
function handle_(db,b){
  const es=db.getSheetByName('活動'),gs=db.getSheetByName('貴賓');
  if(!es||!gs)throw Error('請先在 Apps Script 執行 setup 初始化');
  const erows=rows_(es), grows=rows_(gs), events=erows.map(event_);
  if(b.action==='read'){
    const ev=events.find(function(v){return v.id===b.event;});
    const guests=grows.map(guest_).filter(function(v){return v.event_id===b.event;});
    const rank=function(role){const i=ev.roles.indexOf(role);return i<0?999:i;};
    guests.sort(function(a,c){return ev&&ev.manual?(a.position-c.position||a.arrived.localeCompare(c.arrived)||a.id.localeCompare(c.id)):(ev?rank(a.role)-rank(c.role):0)||a.arrived.localeCompare(c.arrived)||a.id.localeCompare(c.id);});
    const known=b.imageVersions||{};
    if(ev&&ev.imageId&&known[ev.id]!==ev.imageId){const parts=rows_(db.getSheetByName('圖片')).filter(function(r){return String(r[0])===ev.imageId;}).sort(function(a,c){return Number(a[1])-Number(c[1]);});ev.image=parts.map(function(r){return String(r[2]);}).join('');}
    return {events:events.reverse(),guests:guests};
  }
  if(b.action==='event'){
    const name=text_(b.name),org=text_(b.organization),date=text_(b.date,10);
    const roles=Array.isArray(b.roles)?b.roles.map(function(v){return text_(v,30);}).filter(Boolean):[];
    if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!roles.length||roles.length>100||new Set(roles).size!==roles.length)throw Error('請填寫活動名稱、日期，職稱不可空白或重複');
    const index=events.findIndex(function(v){return v.id===b.id;});
    if(b.id&&index<0)throw Error('找不到活動');
    const old=index>=0?events[index]:null,id=old?old.id:Utilities.getUuid();
    let imageId=old?old.imageId:'';
    if(b.image!==undefined){
      if(typeof b.image!=='string')throw Error('圖片格式錯誤');
      if(b.image){
        if(b.image.length>600000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(b.image))throw Error('圖片格式錯誤或過大');
        const bytes=Utilities.base64Decode(b.image.split(',')[1]);
        if(bytes.length<4||(bytes[0]&255)!==255||(bytes[1]&255)!==216||(bytes[bytes.length-2]&255)!==255||(bytes[bytes.length-1]&255)!==217)throw Error('圖片不是有效的 JPEG');
        imageId=Utilities.getUuid();const chunks=[];
        for(let i=0;i<b.image.length;i+=40000)chunks.push([imageId,i/40000,b.image.slice(i,i+40000)]);
        const images=db.getSheetByName('圖片');images.getRange(images.getLastRow()+1,1,chunks.length,3).setValues(chunks);
      }else imageId='';
    }
    const row=[id,name,org,date,JSON.stringify(roles),old?old.manual:0,old?old.version+1:0,imageId];
    if(old)saveRow_(es,index,row);else append_(es,row);
    return {id:id};
  }
  const index=events.findIndex(function(v){return v.id===b.event;});
  if(index<0)throw Error('請先選擇活動');
  const ev=events[index];
  if(b.action==='checkin'){
    const name=text_(b.name,50),role=text_(b.role,30),unit=text_(b.unit);
    if(!name||ev.roles.indexOf(role)<0)throw Error('請填寫姓名並選擇有效職稱');
    const id=text_(b.id,80)||Utilities.getUuid();
    if(grows.some(function(r){return String(r[0])===id&&String(r[1])===ev.id;}))return {ok:true};
    if(grows.some(function(r){return String(r[1])===ev.id&&String(r[2])===name&&String(r[3])===role&&String(r[4])===unit;}))throw Error('這位貴賓已完成報到，請至司儀頁確認');
    append_(gs,[id,ev.id,name,role,unit,new Date().toISOString(),0,Date.now()]);return {ok:true};
  }
  if(b.action==='introduced'){
    const gi=grows.findIndex(function(r){return String(r[0])===b.id&&String(r[1])===ev.id;});
    if(gi<0)throw Error('找不到貴賓');gs.getRange(gi+2,7).setValue(b.value?1:0);return {ok:true};
  }
  if(b.action==='sort'){es.getRange(index+2,6,1,2).setValues([[0,ev.version+1]]);return {ok:true};}
  if(b.action==='order'){
    if(Number(b.version)!==ev.version)throw Error('另一個畫面已更新順序，請重新操作');
    const ids=b.ids;if(!Array.isArray(ids)||ids.length>2000||new Set(ids).size!==ids.length)throw Error('無效排序');
    const present=grows.filter(function(r){return String(r[1])===ev.id;}).map(function(r){return String(r[0]);});
    if(ids.some(function(id){return present.indexOf(id)<0;}))throw Error('名單已變動，請重新整理');
    const ranks={};ids.forEach(function(id,i){ranks[id]=i;});
    if(grows.length){const positions=grows.map(function(r){return [String(r[1])===ev.id&&Object.prototype.hasOwnProperty.call(ranks,r[0])?ranks[r[0]]:r[7]];});gs.getRange(2,8,positions.length,1).setValues(positions);}
    es.getRange(index+2,6,1,2).setValues([[1,ev.version+1]]);return {ok:true};
  }
  throw Error('未知操作');
}
