var niveles = [ res.mapa1_tmx , res.mapa2_tmx, res.mapa3_tmx, res.mapa4_tmx, res.mapa5_tmx ];
var nivelActual = 0;

var tipoCamioneta = 1;
var tipoSuelo = 2;
var tipoAnimal = 3;
var tipoMeta = 4;

var idCapaJuego = 1;

var GameLayer = cc.Layer.extend({
    space:null,
    mapa: null,
    mapaAncho: null,
    teclaIzquierda:false,
    teclaDerecha:false,
    camioneta:null,
    tiempo:0,
    animal:null,
    widthCamioneta:0,
    heightCamioneta:0,
    puentes:[],
    metas:[],
    ctor:function () {
        this._super();
        var size = cc.winSize;

        this.tiempo = new Date().getTime();

        // Inicializar Space
        this.space = new cp.Space();
        this.space.gravity = cp.v(0, -350);
        this.space.damping = 0.5;

        // Depuración
        /*this.depuracion = new cc.PhysicsDebugNode(this.space);
        this.addChild(this.depuracion, 10);*/

        this.cargarMapa();

        //Cargar camioneta
        this.camioneta = new cc.PhysicsSprite("#camioneta.png");
        var body = new cp.Body(1, cp.momentForBox(1, 0, this.camioneta.width-20, this.camioneta.height-20));
        this.widthCamioneta = size.width*0.35;
        this.heightCamioneta = size.height*0.4;
        body.p = cc.p(this.widthCamioneta, this.heightCamioneta);
        this.camioneta.setBody(body);
        this.space.addBody(body);
        var shape = new cp.BoxShape(body, this.camioneta.width-60, this.camioneta.height-40);
        shape.setFriction(1);
        shape.setCollisionType(tipoCamioneta);
        this.space.addShape(shape);
        this.addChild(this.camioneta);

        //Cargar animal
        switch (nivelActual)
        {
            case 0: this.animal = new Rana(this, cc.p(size.width*0.3 , size.height*0.6)); break;
            case 1: this.animal = new Cuervo(this, cc.p(size.width*0.3 , size.height*0.6)); break;
            default: this.animal = new Rana(this, cc.p(size.width*0.3 , size.height*0.6)); break;
        }


        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyPressed:  function(keyCode, event){
                var instancia = event.getCurrentTarget();
                /*if(instancia.keyPulsada == keyCode)
                    return;*/
                instancia.keyPulsada = keyCode;
                if( keyCode == 37 && (new Date().getTime() - instancia.tiempo) > 200 ){
                     instancia.camioneta.body.applyImpulse(cp.v(-50, 0), cp.v(0,0));
                     instancia.tiempo = new Date().getTime();
                }
                if( keyCode == 39 && (new Date().getTime() - instancia.tiempo) > 200 ){
                       instancia.camioneta.body.applyImpulse(cp.v(85,0), cp.v(0,0));
                       instancia.tiempo = new Date().getTime();
                }
            },
            onKeyReleased: function(keyCode, event){
                if(keyCode == 37 || keyCode == 39){
                      var instancia = event.getCurrentTarget();
                      instancia.keyPulsada = null;
                }
            }
        }, this);

        this.scheduleUpdate();

        this.space.addCollisionHandler(tipoAnimal, tipoCamioneta,  null, null, this.colisionAnimalConJugador.bind(this), null);
        this.space.addCollisionHandler(tipoAnimal, tipoSuelo,  null, null, this.colisionAnimalConSuelo.bind(this), null);
        this.space.addCollisionHandler(tipoCamioneta, tipoMeta, null, this.colisionCamionetaConMeta.bind(this), null, null);

        return true;
    },update:function (dt) {
        this.space.step(dt);

        this.animal.update(dt);

        for(var i = 0; i < this.puentes.length; i++) {
            var puente = this.puentes[i];
                puente.moverAutomaticamente();
        }

        var posicionCamioneta = this.camioneta.getBody().p.x-200;
        this.setPosition(cc.p(- posicionCamioneta,0));
        var bodyCamioneta = this.camioneta.body;
        if(bodyCamioneta.getVel().x > 200)
            bodyCamioneta.setVel(cp.v(200, bodyCamioneta.getVel().y))
        if(bodyCamioneta.getVel().x < -100)
             bodyCamioneta.setVel(cp.v(-100, bodyCamioneta.getVel().y))

        // Caída, sí cae vuelve a la posición inicial
        if( this.camioneta.body.p.y < -100){
            this.camioneta.body.p = cc.p(this.widthCamioneta , this.heightCamioneta);
        }
    }, cargarMapa:function () {
        this.mapa = new cc.TMXTiledMap(niveles[nivelActual]);
        // Añadirlo a la Layer
        this.addChild(this.mapa);
        // Ancho del mapa
        this.mapaAncho = this.mapa.getContentSize().width;

        // Solicitar los objeto dentro de la capa Suelos
        var grupoSuelos = this.mapa.getObjectGroup("Suelos");
        var suelosArray = grupoSuelos.getObjects();

        // Los objetos de la capa suelos se transforman a
        // formas estáticas de Chipmunk ( SegmentShape ).
        for (var i = 0; i < suelosArray.length; i++) {
            var suelo = suelosArray[i];
            var puntos = suelo.polylinePoints;
            for(var j = 0; j < puntos.length - 1; j++){
                var bodySuelo = new cp.StaticBody();

                var shapeSuelo = new cp.SegmentShape(bodySuelo,
                    cp.v(parseInt(suelo.x) + parseInt(puntos[j].x),
                        parseInt(suelo.y) - parseInt(puntos[j].y)),
                    cp.v(parseInt(suelo.x) + parseInt(puntos[j + 1].x),
                        parseInt(suelo.y) - parseInt(puntos[j + 1].y)),
                    10);
                shapeSuelo.setFriction(0);
                shapeSuelo.setCollisionType(tipoSuelo);
                this.space.addStaticShape(shapeSuelo);
            }
        }

        /*var grupoPuentes = this.mapa.getObjectGroup("Puentes");
        var puentesArray = grupoPuentes.getObjects();
        for(var i=0; i<puentesArray.length;i++){
            var puente = new Puente(this,
                cc.p(puentesArray[i]["x"], puentesArray[i]["y"]));
            this.puentes.push(puente);
        }*/

        var grupoMetas = this.mapa.getObjectGroup("Meta");
        var arrayMeta = grupoMetas.getObjects();
        var meta = new Meta(this, cc.p(arrayMeta[0]["x"], arrayMeta[0]["y"]));

    }, colisionAnimalConJugador:function(arbiter, space) {
         if (this.animal.saltando == true)
            this.animal.terminaSalto();
    }, colisionAnimalConSuelo:function(arbiter, space) {
            /* cc.director.pause();
             cc.audioEngine.stopMusic();*/
            cc.director.runScene(new GameScene());
    }, colisionCamionetaConMeta:function(arbiter, space){
        nivelActual = nivelActual +1;
        cc.director.runScene(new GameScene());
    }
});

var GameScene = cc.Scene.extend({
    onEnter:function () {
        this._super();
        cc.director.resume();
        //cache
        cc.spriteFrameCache.addSpriteFrames(res.camioneta_plist);
        cc.spriteFrameCache.addSpriteFrames(res.rana_plist);
        cc.spriteFrameCache.addSpriteFrames(res.cuervo_plist);
        cc.spriteFrameCache.addSpriteFrames(res.puente_plist);
        cc.spriteFrameCache.addSpriteFrames(res.meta_plist);
        var layer = new GameLayer();
        this.addChild(layer);


    }
});
