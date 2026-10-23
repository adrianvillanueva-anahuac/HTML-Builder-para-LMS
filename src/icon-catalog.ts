// Shared by the existing editor gallery and the interactive-button picker.
export const iconCatalog:Record<string,readonly string[]>={
  "Referencias y Recursos": ['play_circle','menu_book','devices','article','language','description','book','public','web','smart_display'],
  "Educación y Aprendizaje": ['school','menu_book','article','assignment','quiz','library_books','history_edu','science','psychology','import_contacts','workspace_premium','calculate','draw','functions'],
  "Alertas y Estados": ['warning','error','check_circle','info','help_center','new_releases','priority_high','task_alt','fact_check','report_problem','campaign','tips_and_updates','verified','block'],
  "Comunicación": ['chat','forum','mail','support_agent','perm_phone_msg','contact_mail','question_answer','alternate_email','speaker_notes','record_voice_over'],
  "Media y Multimedia": ['play_circle','videocam','image','mic','headset','movie','photo_camera','headphones','volume_up','volume_off','palette','music_note','collections','art_track'],
  "Acciones e Interactividad": ['ads_click','touch_app','mouse','pan_tool_alt','drag_indicator','swipe','pinch','open_in_new','search','settings','build','download','cloud_download','upload','edit','delete','share','reply','save','filter_alt'],
  "General y Varios": ['lightbulb','star','flag','group','insights','timeline','table_chart','language','attach_money','emoji_objects','public','bolt','rocket_launch','extension','visibility','lock','explore','event'],
  "Tecnología y Dispositivos": ['laptop_mac','smartphone','computer','desktop_mac','window','keyboard','memory','sd_card','cast','print','developer_mode','devices']
};
export const buttonQuickIcons=[['expand_more','Desplegar'],['arrow_forward','Flecha'],['link','Enlace'],['open_in_new','Abrir'],['play_circle','Reproducir'],['download','Descargar'],['info','Información'],['menu_book','Libro'],['school','Aprendizaje'],['add','Más'],['touch_app','Clic'],['','Sin icono']] as const;

export const iconDisplayName=(name:string)=>buttonQuickIcons.find(([icon])=>icon===name)?.[1]||name.replaceAll('_',' ');
