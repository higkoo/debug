package routers

import (
	"gitlab.com/higkoohk/Mash/controllers"
	"github.com/astaxie/beego"
)

func init() {
    beego.Router("/", &controllers.MainController{})
}
