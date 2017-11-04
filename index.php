<html><head><title>.:: PHP Server Monitor :..</title></head> <div align="center">
<?php
$system = ini_get('system');
$win  = is_bool($system);
$count = 1;

$host[1] = "http://www.bilibili.com/";
$host[2] = "http://www.baidu.com/";
$host[3] = "http://www.google.com/";
$host[4] = "http://cn.bing.com/";
$host[5] = "http://www.iqiyi.com/";
$host[6] = "http://www.12306.cn/";
$host[7] = "http://github.com/";
$host[8] = "http://www.youku.com/";
$host[9] = "http://news.163.com/";
$host[10] = "http://www.kingsoft.com/";

$services[1] = "bilibili";
$services[2] = "baidu";
$services[3] = "google";
$services[4] = "bing";
$services[5] = "iqiyi";
$services[6] = "12306";
$services[7] = "github";
$services[8] = "youku";
$services[9] = "163";
$services[10] = "kingsoft";

// You don't need to edit anything beyond here
echo "<table border=\"0\" align=\"center\">";
foreach ($host as $value) 
{
	
	$counter = $counter + 1;
	echo "<tr><td width=120>$value</td>"; 
	echo '<body bgcolor="#FFFFFF" text="#000000"></body>';      
	
  	$ch = curl_init($value);
	@curl_setopt($ch, CURLOPT_HEADER         ,true); 
	@curl_setopt($ch, CURLOPT_NOBODY         ,true); 
	@curl_setopt($ch, CURLOPT_RETURNTRANSFER ,true); 
	curl_exec($ch);
	
	  if ( !curl_errno($ch))
  		{
			#echo "<td width=60><strong><font color='#006600'>UP</font></strong></td>";
			echo "<td width=60><img src='http://icons.iconarchive.com/icons/gakuseisean/ivista/128/Good-or-Tick-icon.png'></td>";
			echo "<td width=230>". $services[$counter] . "</td>";
		    echo "<td>Reply Speed ";
		  $info = curl_getinfo($ch);
		    echo $info['total_time'];
		}
	  else 
		{
			#echo "<td width=60><strong><font color='#990000'>DOWN</font></strong></td>";
			echo "<td width=60><img src='https://upload.wikimedia.org/wikipedia/commons/6/61/Crystal_128_error.png'></td>";
			echo "<td width=230>". $services[$counter] . "</td>";
		    echo "<td>";
			echo "Timeout...";
		}
	curl_close($ch);
}
echo "</td></tr></table>";
?>
</font></div>
