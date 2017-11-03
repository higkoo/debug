<html><head><title>.:: PHP Server Monitor :..</title></head> <div align="center">
<?php
$system = ini_get('system');
$win  = is_bool($system);
$count = 1;

$host[1] = "www.bilibili.com";
$host[2] = "www.baidu.com";
$host[3] = "www.google.com";
$host[4] = "cn.bing.com";
$host[5] = "www.iqiyi.com";
$host[6] = "www.12306.cn";
$host[7] = "github.com";
$host[8] = "www.youku.com";
$host[9] = "news.163.com";
$host[10] = "www.kingsoft.com";

$services[1] = "User Documents, T: Drive";
$services[2] = "Active Directory";
$services[3] = "Backup Active Directory";
$services[4] = "Email, Webmail";
$services[5] = "Sims, Payroll, G: Drive";
$services[6] = "Sharepoint VLE 2003";
$services[7] = "Sharepoint VLE 2007 Test";
$services[8] = "Oliver Library Database";
$services[9] = "Backup, Shared Printers";
$services[10] = "User Settings";

// You don't need to edit anything beyond here
echo "<table border=\"0\" align=\"center\">";
foreach ($host as $value) 
{
	 $counter = $count + 1;
	  echo "<tr><td width=120>$value</td>"; 
      echo '<body bgcolor="#FFFFFF" text="#000000"></body>';       
      //check target IP or domain
	  $pingreply = exec("ping -n $count $value");
	  if ( substr($pingreply, -2) == 'ms')
  		{
			#echo "<td width=60><strong><font color='#006600'>UP</font></strong></td>";
			echo "<td width=60><img src='up.png'></td>";
			echo "<td width=230>". $services[$counter] . "</td>";
		    echo "<td>Reply Speed ";
		    echo substr($pingreply, -13);
		}
	  else 
		{
			#echo "<td width=60><strong><font color='#990000'>DOWN</font></strong></td>";
			echo "<td width=60><img src='down.jpg'></td>";
			echo "<td width=230>". $services[$counter] . "</td>";
		    echo "<td>";
			echo "Timeout...";
		}
}
echo "</td></tr></table>";
?>
</font></div>
