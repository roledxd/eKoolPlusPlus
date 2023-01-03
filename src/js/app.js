
const {ipcRenderer} = require("electron");
const ipc = ipcRenderer;
var all_roles = [];
var current_role = null;


window.addEventListener("load", async()=>{
    var app = document.getElementsByClassName("app")[0];
    switch (app.id) {
        case "auth-app-page":
            console.log("Auth page initialized")
            auth_signin.addEventListener('click', async()=>{
                var input_un = document.getElementById("auth-username");
                var input_pwd = document.getElementById("auth-password");
                if(input_pwd.value.length == 0 || input_un.value.length == 0) return;
                await ipcCall("authenticate", [input_un.value, input_pwd.value]);
            });
            break;
        case "feeditem":
            console.log("FeedItem page initialized")
            var content = document.getElementById("content")
            content.innerHTML = "<div class='loadingIndicator'></div>";
            break;
        case "main-app-page":
            console.log("Feed page initialized")
            feed.addEventListener('click', async()=>{
                await ipcCall("get_feed");
            })
            
            cal.addEventListener('click', async()=>{
                toggle_prog(true);
                act_btn("cal");
            })
            
            viru.addEventListener('click', async()=>{
                toggle_prog(true);
                await ipcCall("get_viruterm");
            })
            
            absences.addEventListener('click', async()=>{
                toggle_prog(true);
                act_btn("absences");
            })
            break;
    }
    
});

//main sections

function toggle_prog(enabled){
    var content = document.getElementById("content");
    switch (enabled) {
        case true:
            content.innerHTML = "<div class='loadingIndicator'></div>"
            break;
    
        case false:
            var arr = document.getElementsByClassName("loadingIndicator");
            if(arr.length >= 1) arr[0].remove();
            break;
    }
}

function act_btn(id){
    ["feed","cal", "viru", "absences"].forEach(stockId => {
        document.getElementById(stockId).classList.remove('active');
    });
    document.getElementById(id).classList.add('active');
}

ipc.on("client", async(event, arg) => {
    var app = document.getElementsByClassName("app")[0].id;
    console.log(arg)
    var method = arg.method;
    var response = arg.response;
    switch (method) {
        case "set_person":
            if(app !== "main-app-page") break;
            await set_person(response);
            break;
        case "set_role":
            if(app !== "main-app-page") break;
            current_role = response;
            await set_role(response, all_roles);
            break;
        case "get_viruterm":
            if(app !== "main-app-page") break;
            var content = document.getElementById("content");
            content.innerHTML = '<iframe style="height:100%; width:100%;"src="'+response+'" title="VTB by RoLed"></iframe>'
            act_btn("viru");
            break;    
        case "get_feed":
            if(app !== "main-app-page") break;
            await show_feed(response)
            break;
        case "load_feed_item_info":
            if(app !== "feeditem") break;
            await show_feed_item(response);
            break;
        default:
            break;
    }
});

async function show_feed_item(response){
    var event = response.lastEvent;
    var dbg = response.dbGrade;
    var content = document.getElementById("content");
    var title_element = document.getElementById("feed_item_title");
    title_element.innerText = event.subjectName;
    content.innerHTML = await uigen.grade_page(event,dbg, response.previousEvents);
    document.title = `${event.abbr} - ${event.subjectName} (${event.authorName})`;
}

async function show_feed(response){
    var feed = response.feed;
    var feed_type = response.feed_type;
    toggle_prog(true);
    var content = document.getElementById("content");
    content.innerHTML = genFeedSel(feed_type)+"<div class='screen' id='screen_feed'></div>"
    var feed_screen = document.getElementById("screen_feed");
    act_btn("feed")
    feed.forEach(feedItem => {
        feed_screen.innerHTML += uigen.feed_item(feedItem,true,null);
    });
    ["all", "grades","other"].forEach(feed_sel => {
        var btn = document.getElementById("feed_"+feed_sel);
        btn.addEventListener('click', async()=>{
            await ipcCall("get_feed", [feed_sel]);
        })    
    });
    
}



async function set_role(role=null, roles=[]){
    toggle_prog(false);
    var rolename = document.getElementById("rolename");
    rolename.innerText = role.firstName;
    document.title = `eKool++ | ${role.schoolName} | ${role.firstName} ${role.lastName}`
    current_role = role;
    await ipcCall("get_feed");
    await setSidebar(roles)
}

async function set_person(person=null){
    toggle_prog(false);
    if(typeof person !== 'object') return;
    
    var content = document.getElementById("content");
    content.innerHTML = ""
    var data = person.personData;
    all_roles = data.roles;
    if(data.roles.length == 0){
        content.innerHTML = "<h2>Использование eKool++ невозможно, у вас нет роли учителя/ученика.</h2>";
        return;
    }
    await set_role(data.roles[0], data.roles);
}

async function setSidebar(roles){
    var sb = document.getElementById("sidebar");
    sb.innerHTML = "";

    if(roles.length != 0) sb.innerHTML += genHeading("Роли:")
    if(roles.length == 0) sb.innerHTML += genHeading("Нет доступных ролей.")
    

    roles.forEach(role => {
        sb.innerHTML += genSection_role(role);
    });

    sb.innerHTML += genHeading("Опции:")
    if(current_role.timetableUrl != null) sb.innerHTML += genSection_button(["Расписание", current_role.schoolName], "🗓", "bg-orange", "timetable", "window.open('"+current_role.timetableUrl+"', '_blank')")
    //sb.innerHTML += genSection_button(["Выйти"], "X", "bg-red", "logout","ipcCall('deauth')");

    addSBFuncs(roles);
    
}

function addSBFuncs(roles){
    roles.forEach(role => {
        document.getElementById("role_"+role.studentId).addEventListener('click', ()=>{
            toggle_prog(true);
            ipcCall("set_role", [role.studentId]);
        });
    });
}

function genFeedSel(sel){
    var actives = {all:"",grades:"",other:""};
    actives[sel] = "active";
    return '<div class="topbar"><div class="titlebarOptions"><button id="feed_all" style="width:33.33%;" class="feed_sel '+actives.all+'">Все</button><button id="feed_grades" style="width:33.33%;" class="feed_sel '+actives.grades+'">Оценки</button><button id="feed_other" style="width:33.33%;" class="feed_sel '+actives.other+'">Другое</button></div></div>';
}

function genHeading(title){
    return '<div class="heading">'+title+'</div>';
}

function genSection_role(role){
    if(typeof role !== "object") return "";
    var gender = "";
    //if(role.gender="M") gender="bg-blue";    
    //else if(role.gender="N") gender = "bg-red";
    var initials = role.firstName.charAt(0).toUpperCase()+role.lastName.charAt(0).toUpperCase();
    var name = role.firstName+" "+role.lastName;
    var img = "";
    if(role.userProfileImgFn !== null ) img="<img src='https://files.ekool.eu/"+role.userProfileImgFn+"' alt='"+name+"'>";
    return "<div id='role_"+role.studentId+"' class='section'><a class='profile'><span class='avatar "+gender+"'><span class='nameFirstLetter'>"+initials+"</span>"+img+"</span><div class='personName'><div class='name'>"+name+"</div><div class='institution'>"+role.schoolName+"</div></div></a></div>"
}

function genSection_button(name=[], initial="?", color="", id="unknown_button", onclick=""){
    var title = ``
    if(name.length == 1) title = `<div class="title">${name[0]}</div>`
    if(name.length == 2) title = `<div class="name">${name[0]}</div><div class="institution">${name[1]}</div>`
    return `<div id="${id}" class="section" onclick="${onclick}">
    <a class="profile">
        <span class="avatar ${color}">
            <span class="nameFirstLetter">${initial}</span>
        </span>
        <div class="personName">
           ${title}
        </div>
    </a>
  </div>`
}

async function ipcCall(method, args=[]){
    var id = Math.random().toString(36).substr(2, 9);
    ipc.send("api", {method: method, args: args, id: id})
}

var uigen = {
    grade_page: function(item,dbg,prev){
        feedItem = item;
        var addparams = '';
        if(feedItem.textContent !== "" && feedItem.textContent !== null){addparams += this.sep("Комментарий оценки"); addparams += this.inner("big", feedItem.textContent)};
        if(dbg !== null){
            if(dbg.journalEventName !== ""){addparams += this.sep("Информация об уроке"); addparams += this.inner("big", dbg.journalEventName); addparams += this.inner("small", dbg.authorName); addparams += this.inner("small", dbg.lessonDate);}
        }
        if(prev.length > 0){
            addparams += this.sep("История изменений");
            prev.forEach(prevgrade => {
                addparams+=this.feed_item(prevgrade, false)
            });
        }
        return this.feed_item(item, false, null,false) + addparams;
    },
    feed_item: function(feedItem, isExpandable=true, dbg=null, showDesc=true){
        switch (feedItem.itemType) {
            //grade
            case 1:
                var grade_name="";
                if(!feedItem.test) grade_name = "Оценка за урок по";
                if(feedItem.gradeTypeId == 5) grade_name = 'Оценка за <span style="color:#006cf2;">задание</span> по';
                if(feedItem.test) grade_name = 'Оценка за <span style="color:red;">контрольную работу</span> по';
                var description="";
                var status = "";
                if(feedItem.hasStatistics) status += '<i class="bi bi-bar-chart-line-fill"></i>';
                var grade = ""
                if(feedItem.gradeTypeId == 1) grade = feedItem.abbr;
                if(dbg !== null){
                    if(dbg.journalEventName !== null){
                        description = dbg.journalEventName;
                    }
                }
                switch (feedItem.actionType) {
                    case 3:
                        grade = "<s style='color:#a7a7a7';>"+feedItem.abbr+"</s>";
                        if(feedItem.test) grade_name = 'Удалённая оценка за <span style="color:red;">контрольную работу</span> по';
                        if(!feedItem.test) grade_name = "Удалённая оценка за урок по";
                        break;
                    case 2:
                        grade = feedItem.abbr+"*";
                        if(feedItem.test) grade_name = 'Измененная оценка за <span style="color:red;">контрольную работу</span> по';
                        if(!feedItem.test) grade_name = "Измененная оценка за урок по";
                        break;
                    default:
                        grade = feedItem.abbr;
                        break;
                }
                if(feedItem.textContent !== "" && feedItem.textContent !== null && showDesc == true) description=feedItem.textContent;
                var opener = "";
                if(isExpandable) opener = '<span class="miniNav"><span class="FR"><a href="#" onclick="ipcCall(\'get_feed_item\', ['+feedItem.id+']);"> Открыть</a></span></span>';
                return '<li class="feed_item" id="grade_'+feedItem.id+'"><div class="icon">'+grade+'</div><div class="eventinfo"><div class="created">'+grade_name+'<strong> '+feedItem.subjectName+' '+status+' </strong>'+opener+'</div><div class="description">'+description+'</div><span class="author">'+feedItem.authorName+'</span><span class="date"> - '+feedItem.lastModified+' </span><div> </div></div></li>';
                break;
            //staff
            case 5:
                return '<li class="feed_item" id="staffmsg_'+feedItem.id+'"><div class="icon"><i class="bi bi-person"></i></div><div class="eventinfo"><div class="created"><strong>'+feedItem.authorName+'</strong> - '+feedItem.title+'</div><div class="description">'+feedItem.content+'</div><span class="date">'+feedItem.lastModified+'</span><div></div></div></li>'; 
                break;
            //group
            case 10:
                return '<li class="feed_item" id="groupmsg_'+feedItem.id+'"><div class="icon"><i class="bi bi-building"></i></div><div class="eventinfo"><div class="created"><strong>'+feedItem.authorName+'</strong> - '+feedItem.title+'</div><div class="description">'+feedItem.content+'</div><span class="date">'+feedItem.lastModified+'</span><div></div></div></li>'; 
                break;
            
            //remark
            case 2:
                switch (feedItem.remarkType) {
                    //remark
                    case 1:
                        return '<li class="feed_item" id="remark-1_'+feedItem.id+'"><div class="icon"><i class="bi bi-chat-left-dots"></i></div><div class="eventinfo"><div class="created"><strong>'+feedItem.authorName+'</strong> - Комментарий/Уведомление</div><div class="description"><p>'+feedItem.textContent+'</p></div><span class="date">'+feedItem.lastModified+'</span><div></div></div></li>'; 
                        break;
                }
                break;
            //absence note
            case 6:
                return '<li class="feed_item" id="remark-1_'+feedItem.id+'"><div class="icon"><i class="bi bi-file-earmark-medical"></i></div><div class="eventinfo"><div class="created"><strong>'+feedItem.authorName+'</strong> - Справка об отсутствии</div><div class="description"><p>'+feedItem.textContent+'</p></div><span class="date">'+feedItem.lastModified+'</span><div></div></div></li>';
                break;
            //banners
            case "special":
                var title = "";
                var subtitle = "";
                if(typeof feedItem.title == "string"){
                    if(feedItem.title.length > 0) title = '<h1 style="color: white;width: 100%;height: 70%;text-align: center;font-size: 30px;">'+feedItem.title+'</h1>';
                }
                if(typeof feedItem.subtitle == "string"){
                    if(feedItem.subtitle.length > 0) subtitle = '<h1 style="color: white;width: 100%;height: 30%;text-align: center;font-size: 20px;">'+feedItem.subtitle+'</h1>';
                }
                return '<li id="special_0" style="align-items: center;background: linear-gradient(90deg, rgba(131,58,180,1) 0%, rgba(253,29,29,1) 50%, rgba(252,176,69,1) 100%);flex-direction: column;display: flex;" class="feed_item">'+title+subtitle+'</li>'; 
                break;
            //empty
            default:
                return '';
                break;
        }
    },
    sep: function(title){
        return '<div class="feeditem-separator">'+title+'</div>';
    },
    inner: function(type,content){
        switch (type) {
            case "small":
                return '<div class="feeditem-smallinner">'+content+'</div>';
                break;
        
            case "big":
                return '<div class="feeditem-biginner">'+content+'</div>';
                break;
        }
    }
}