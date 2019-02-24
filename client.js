"use strict";

$(function(){
  var db = firebase.database();
  var uniquesRef = db.ref('uniques');
  var uniquesEl = $('.unique-list');

  uniquesRef.on('value', function(snap){
    updateUniques(uniquesEl, snap.val());
    highlightInfo();
    jQuery("time.timeago").timeago();
  });

  function updateUniques(containerEl, uniques){
    // reset html
    containerEl.html('');

    // for each unique in obj..
    for(var uniqueName in uniques){

      // check if we have subtypes
      if(!uniques[uniqueName].hasOwnProperty('status')) {
        for(var type in uniques[uniqueName]) {
          var fullName = uniqueName +' ('+ type +')';
          containerEl.append(uniqueTemplate(fullName, uniques[uniqueName][type]));
        }
      }
      else {
        containerEl.append(uniqueTemplate(uniqueName, uniques[uniqueName]));
      }
    }
  }

  function highlightInfo() {
    var uniqueEls = $('.unique-list-item');
    uniqueEls.each(function(i, el){
      // console.log(el);
      var $el = $(el);
      if($el.children('.unique-status').text() === 'alive') {
        $el.addClass('unique-alive');
      }
    })
  }

  function uniqueTemplate(uniqueName, uniqueData){
    var name = uniqueName.match(/.*Shaba.*/) ? 'Shaba' : uniqueName;
    // get current UTC time
    var now = new Date();
    now += now.getTimezoneOffset();

    // create date object in UTC time for when the event happened
    var date = new Date();
    date.setHours(...uniqueData.statusUpdateTime.split(":"));
    date += date.getTimezoneOffset();

    // correct the day since we dont get date of spawn.. assume all times are within the last day
    if(date > now) date.setDate(date.getDate()-1);

    var action = uniqueData.status === 'alive' ? 'Spawned ' : 'Died ';
    var highlightClass = uniqueData.status === 'alive' ? 'unique-alive' : '';

    // highlight colors based on time dead
    if(uniqueData.status === 'dead') {
      var minsSince = Math.round((now-date) / 60000); //

      // if dead > 3.5 hours
      if(minsSince > 60*3.5) {
        highlightClass = 'unique-very-soon';
      }
      // if dead more than 60 mins
      else if(minsSince > 60) {
        highlightClass = 'unique-soon';
      }
    }

    var currTimezoneEventTime = date+date.timeZoneOffset();
    var temp = '<div class="unique-list-item '+ highlightClass +'">\n' +
                '  <div class="unique-name">' + name + '</div>\n' +
                '  <div class="unique-status-update-time">'+ action +
                '<time class="timeago" dateTime="'+currTimezoneEventTime.toLocaleString()+'"></time></div>\n' +
               '</div>';

    return temp;
  }
});
