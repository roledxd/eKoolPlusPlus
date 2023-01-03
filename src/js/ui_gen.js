module.exports = {
    grade_page: async function(item,dbg,prev){
        feedItem = item;
        var addparams = '';
        if(feedItem.textContent !== "" && feedItem.textContent !== null){addparams += this.sep("Комментарий оценки"); addparams += this.inner("big", feedItem.textContent)};
        if(dbg !== null){
            if(dbg.journalEventName !== ""){addparams += this.sep("Информация об уроке"); addparams += this.inner("big", dbg.journalEventName); addparams += this.inner("small", dbg.authorName); addparams += this.inner("small", dbg.lessonDate);}
        }
        if(prev.length > 0){
            addparams += sep("История изменений");
            prev.forEach(prevgrade => {
                addparams+=this.feed_item(prevgrade, false)
            });
        }
        return this.feed_item(item, false, null,false) + addparams;
    },
    feed_item: async function(feedItem, isExpandable=true, dbg=null, showDesc=true){
        switch (feedItem.itemType) {
            //grade
            case 1:
                var grade_name="";
                if(!feedItem.test) grade_name = "Оценка за урок по";
                if(feedItem.gradeTypeId == 5) grade_name = 'Оценка за <span style="color:#006cf2;">задание</span> по';
                if(feedItem.test) grade_name = 'Оценка за <span style="color:red;">контрольную работу</span> по';
                var description="";
                var status = "";
                if(feedItem.hasStatistics) status += "📊";
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
                return '<li class="feed_item" id="staffmsg_'+feedItem.id+'"><div class="icon">✉</div><div class="eventinfo"><div class="created"><strong>'+feedItem.authorName+'</strong> - '+feedItem.title+'</div><div class="description">'+feedItem.content+'</div><span class="date">'+feedItem.lastModified+'</span><div></div></div></li>'; 
                break;
            //group
            case 10:
                return '<li class="feed_item" id="groupmsg_'+feedItem.id+'"><div class="icon">🏫</div><div class="eventinfo"><div class="created"><strong>'+feedItem.authorName+'</strong> - '+feedItem.title+'</div><div class="description">'+feedItem.content+'</div><span class="date">'+feedItem.lastModified+'</span><div></div></div></li>'; 
                break;
            
            //remark
            case 2:
                switch (feedItem.remarkType) {
                    //remark
                    case 1:
                        return '<li class="feed_item" id="remark-1_'+feedItem.id+'"><div class="icon">💬</div><div class="eventinfo"><div class="created"><strong>'+feedItem.authorName+'</strong> - Комментарий/Уведомление</div><div class="description"><p>'+feedItem.textContent+'</p></div><span class="date">'+feedItem.lastModified+'</span><div></div></div></li>'; 
                        break;
                }
                break;
    
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
};