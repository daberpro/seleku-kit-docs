(() => {
  // node_modules/dabcom/res/Reactivity.js
  var Reactivity = class {
    #onGet = null;
    #onSet = null;
    constructor(config) {
      this.#onGet = config.Getter;
      this.#onSet = config.Setter;
    }
    setReactive(Obj) {
      if (typeof this.#onGet !== "function") {
        this.#onGet = () => {
        };
      }
      if (typeof this.#onSet !== "function") {
        this.#onGet = () => {
        };
      }
      const onGet = this.#onGet;
      const onSet = this.#onSet;
      const obj = new Proxy(Obj, {
        get(object, propertyName) {
          return onGet(object, propertyName) || object[propertyName];
        },
        set(object, propertyName, valueSet) {
          if (typeof valueSet === "function") {
            Obj[propertyName] = valueSet(object, propertyName, valueSet) || null;
          } else {
            Obj[propertyName] = valueSet;
          }
          onSet(object, propertyName, valueSet);
          return 1;
        }
      });
      return obj;
    }
  };

  // node_modules/dabcom/res/dabMainClass.js
  var Main = class {
    #allComponentId = {};
    #kindOfComponentBindingData = {};
    createRawComponent(name, attribute) {
      return {
        name,
        content: attribute?.content,
        attribute: attribute?.attribute,
        parentComponent: attribute?.parentComponent,
        positionComponent: attribute?.positionComponent,
        state: attribute?.state || {},
        event: attribute?.event || {},
        id: attribute?.id
      };
    }
    createComponent(rawComponent, embedData = {}) {
      const element = document.createElement(rawComponent.name);
      if (rawComponent?.attribute instanceof Object) {
        for (let x in rawComponent?.attribute) {
          element.setAttribute(x, rawComponent?.attribute[x]);
        }
      }
      const textNode = document.createTextNode(rawComponent?.content);
      element.appendChild(textNode);
      return {
        element,
        content: textNode,
        rawContent: rawComponent?.content,
        parent: rawComponent.parentComponent,
        position: rawComponent.positionComponent,
        state: rawComponent?.state,
        event: rawComponent?.event,
        ...embedData,
        destroy(onDestroy = () => {
        }) {
          onDestroy();
          element.remove();
        },
        updateTextNode() {
          const text = this.rawContent;
          const resultText = eval(text);
          this.content.replaceData(0, text.length, resultText);
        },
        updateAttribute() {
        }
      };
    }
    renderComponent(StackRawComponent, target, embedData2 = {}) {
      const StackComponent = [];
      let State = {};
      const kindOfComponentBindingData = this.#kindOfComponentBindingData;
      for (let x of StackRawComponent) {
        const componentCreated = this.createComponent(x, embedData2);
        State = { ...State, ...componentCreated.state };
        if (x?.id) {
          this.#allComponentId[x?.id] = {
            ...componentCreated,
            state: new Reactivity({
              Getter(object, propertyName) {
                return object[propertyName];
              },
              Setter(object, propertyName, valueSet) {
                for (let x2 of kindOfComponentBindingData[propertyName]) {
                  x2.state[propertyName] = valueSet;
                  x2.updateTextNode();
                }
              }
            }).setReactive(State)
          };
        }
        if (x?.event instanceof Object) {
          for (let y in x?.event) {
            componentCreated.element[y] = () => x?.event[y]({
              state: new Reactivity({
                Getter(object, propertyName) {
                  return object[propertyName];
                },
                Setter(object, propertyName, valueSet) {
                  for (let x2 of kindOfComponentBindingData[propertyName]) {
                    x2.state[propertyName] = valueSet;
                    x2.updateTextNode();
                  }
                }
              }).setReactive(State)
            });
          }
        }
        for (let y of Object.keys(componentCreated.state)) {
          if (kindOfComponentBindingData[y] instanceof Array) {
            kindOfComponentBindingData[y].push(componentCreated);
          } else {
            kindOfComponentBindingData[y] = [];
            kindOfComponentBindingData[y].push(componentCreated);
          }
        }
        ;
        StackComponent.push(componentCreated);
      }
      const element2 = {};
      for (let x of StackComponent) {
        x.updateTextNode();
        if (!element2[x.position]) {
          element2[x.position] = x.element;
          if (element2[x.parent]) {
            element2[x.parent].appendChild(x.element);
          }
        } else {
          element2[x.position].appendChild(x.element);
        }
      }
      if (target instanceof HTMLElement)
        target.appendChild(element2[Object.keys(element2)[0]]);
      return {
        destroy: StackComponent[0].destroy,
        component: StackComponent[0],
        state: new Reactivity({
          Getter(object, propertyName) {
            return object[propertyName];
          },
          Setter(object, propertyName, valueSet) {
            for (let x of kindOfComponentBindingData[propertyName]) {
              x.state[propertyName] = valueSet;
              x.updateTextNode();
            }
          }
        }).setReactive(State),
        updateComponentRendered() {
          for (let x of StackComponent) {
            x.updateTextNode();
          }
        }
      };
    }
    replaceChild(newComponent, oldComponent) {
      oldComponent.parentElement.replaceChild(newComponent.element, oldComponent);
    }
    findById(id) {
      return this.#allComponentId[id];
    }
  };

  // node_modules/dabcom/res/dabMain.js
  var dabMain = new Main();
  function findById(id) {
    return dabMain.findById(id);
  }
  function Render(Component, target, embedData2) {
    return {
      ...dabMain.renderComponent(Component, target, embedData2),
      updateComponentProperty(componentFunction, property) {
        const newComponent = dabMain.renderComponent(componentFunction(property), void 0, embedData2);
        dabMain.replaceChild(newComponent.component, this.component.element);
      }
    };
  }

  // node_modules/dabcom/spa/route.js
  var SPA = class {
    #router = [];
    #previousComponentRendered = null;
    constructor() {
      window.addEventListener("DOMContentLoaded", () => {
        document.body.onclick = (e) => {
          if (e.target.matches("[data-link]")) {
            e.preventDefault();
            this.navigateTo(e.target.href);
          }
        };
      });
      window.onpopstate = () => {
        this.render();
      };
    }
    navigateTo(url) {
      history.pushState(null, null, url);
      this.render();
    }
    addNewRouter(path, handler) {
      this.#router.push({
        path,
        event: handler,
        isMatch: false
      });
    }
    matchRoute(path) {
      return location.pathname === path;
    }
    updateRouteHandler() {
      const match = this.matchRoute;
      this.#router = this.#router.map((e) => ({
        path: e.path,
        event: e.event,
        isMatch: match(e.path)
      }));
    }
    render() {
      this.updateRouteHandler();
      let routeHandler = this.#router.find((e) => e.isMatch);
      if (!routeHandler) {
        routeHandler = {
          path: location.pathname,
          event: () => {
            console.log("page not found");
          },
          isMatch: true
        };
      }
      if (this.#previousComponentRendered instanceof Object) {
        this.#previousComponentRendered.destroy();
        this.#previousComponentRendered = routeHandler.event();
      } else {
        this.#previousComponentRendered = routeHandler.event();
      }
    }
    routeTo(path, handler) {
      this.addNewRouter(path, handler);
    }
  };
  var Router = {
    SPA: new SPA(),
    route({ path, component, data = {}, target = () => {
    }, onrender = () => {
    } }) {
      this.SPA.routeTo(path, () => {
        const Component = Render(component, target(), data);
        onrender(Component);
        return Component;
      });
      this.SPA.render();
    }
  };

  // source/component/card.selek
  function Card({
    title,
    description,
    buttoninfo,
    pesan,
    x,
    url,
    parentcomponent,
    positioncomponent
  }) {
    return [dabMain.createRawComponent(`div`, {
      content: "`                            `",
      parentComponent: parentcomponent,
      positionComponent: "10605010563040058880600070180927" + x.title,
      state: {},
      event: {},
      attribute: {
        "class": "card"
      },
      id: ""
    }), dabMain.createRawComponent(`h1`, {
      content: "`${this.state.title}`",
      parentComponent: "10605010563040058880600070180927" + x.title,
      positionComponent: "22670086402543808053108200706020" + x.title,
      state: {
        title
      },
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`p`, {
      content: "`            ${this.state.description}        `",
      parentComponent: "10605010563040058880600070180927" + x.title,
      positionComponent: "60000135497542008300709030239320" + x.title,
      state: {
        description
      },
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                    `",
      parentComponent: "10605010563040058880600070180927" + x.title,
      positionComponent: "1806000689344030a000177658000113" + x.title,
      state: {},
      event: {},
      attribute: {
        "class": "action"
      },
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`${this.state.buttoninfo}`",
      parentComponent: "1806000689344030a000177658000113" + x.title,
      positionComponent: "79453007235840308603601000706507" + x.title,
      state: {
        buttoninfo
      },
      event: {},
      attribute: {
        "href": url,
        "data-link": ""
      },
      id: ""
    })];
  }

  // source/docs/index.selek
  var _allContent = [{
    title: "API",
    description: "seleku juga memiliki api yang anda gunakan untuk menggunakan seleku lebih jauh",
    pesan: "Lihat API",
    url: "/api"
  }, {
    title: "Syntax",
    description: "pelajari cara penulisan sintaks pada seleku",
    pesan: "Belajar dasar-dasar",
    url: "/docs/syntax"
  }, {
    title: "Config",
    description: "lihat apa saja configurasi yang mungkin untuk anda lakukan pada seleku",
    pesan: "setup konfigurasi",
    url: "/docs/config"
  }];
  function allContent({
    parentcomponent,
    positioncomponent
  }) {
    let content = [];
    let index = 0;
    for (let x of _allContent) {
      content = [...content, ...Card({
        "title": x.title,
        "description": x.description,
        "buttoninfo": x.pesan,
        "pesan": x.pesan,
        "x": x,
        "url": x.url,
        "parentcomponent": parentcomponent
      })];
    }
    return content;
  }
  function Docs() {
    return [dabMain.createRawComponent(`div`, {
      content: "`                    `",
      parentComponent: "",
      positionComponent: "00033306105040008423110004003900",
      state: {},
      event: {},
      attribute: {
        "class": "alldocs"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "00033306105040008423110004003900",
      positionComponent: "53480860160140549204702348020060",
      state: {},
      event: {},
      attribute: {
        "class": "navbar"
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "53480860160140549204702348020060",
      positionComponent: "71080000702440068811176520960392",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    Home                `",
      parentComponent: "71080000702440068811176520960392",
      positionComponent: "16005230807040208180687027096946",
      state: {},
      event: {},
      attribute: {
        "href": "/",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "53480860160140549204702348020060",
      positionComponent: "40490007059747838014921688001930",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    Docs                `",
      parentComponent: "40490007059747838014921688001930",
      positionComponent: "2007510315394430a028588604005040",
      state: {},
      event: {},
      attribute: {
        "href": "/docs",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "53480860160140549204702348020060",
      positionComponent: "14500050400440608080902006527480",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    API                `",
      parentComponent: "14500050400440608080902006527480",
      positionComponent: "17500480116042009102174000440005",
      state: {},
      event: {},
      attribute: {
        "href": "/api",
        "data-link": ""
      },
      id: ""
    }), ...allContent({
      "parentcomponent": "00033306105040008423110004003900",
      "positioncomponent": "70004228723645608700404213100300"
    })];
  }

  // source/seleku-kit.png
  var seleku_kit_default = "data:image/png;base64,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";

  // source/esbuild.png
  var esbuild_default = "data:image/png;base64,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";

  // source/home/index.selek
  async function AllContributor({
    parentcomponent,
    positioncomponent
  }) {
    let loopingComponent = [];
    const data = await (await fetch("https://api.github.com/repos/daberpro/dabcom/contributors")).json();
    for (let x of data) {
      loopingComponent = [...loopingComponent, ...[dabMain.createRawComponent(`img`, {
        content: "``",
        parentComponent: parentcomponent,
        positionComponent: "53908070150440808481170604200003" + x.node_id,
        state: {},
        event: {},
        attribute: {
          "title": x.login,
          "src": x.avatar_url
        },
        id: ""
      })]];
    }
    return loopingComponent;
  }
  async function Home() {
    document.title = "Seleku-kit";
    return [dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "",
      positionComponent: "10259508001840059000040032609100",
      state: {},
      event: {},
      attribute: {
        "class": "main"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "10259508001840059000040032609100",
      positionComponent: "19168000170549008006561022064308",
      state: {},
      event: {},
      attribute: {
        "class": "navbar"
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "19168000170549008006561022064308",
      positionComponent: "18120570914040008420404000800010",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`Home`",
      parentComponent: "18120570914040008420404000800010",
      positionComponent: "90330000105040508109200409007001",
      state: {},
      event: {},
      attribute: {
        "href": "/",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "19168000170549008006561022064308",
      positionComponent: "90433088727040379605823401080080",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`Docs`",
      parentComponent: "90433088727040379605823401080080",
      positionComponent: "10092007801448028003695000087680",
      state: {},
      event: {},
      attribute: {
        "href": "/docs",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "19168000170549008006561022064308",
      positionComponent: "1789802150004080a000640003070037",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`API`",
      parentComponent: "1789802150004080a000640003070037",
      positionComponent: "95708995700040768027080056930080",
      state: {},
      event: {},
      attribute: {
        "href": "/api",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "10259508001840059000040032609100",
      positionComponent: "50311000070040099252162074084054",
      state: {},
      event: {},
      attribute: {
        "class": "header"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "50311000070040099252162074084054",
      positionComponent: "11641003603040608708900000009090",
      state: {},
      event: {},
      attribute: {
        "class": "box"
      },
      id: ""
    }), dabMain.createRawComponent(`h1`, {
      content: "`Seleku-Kit`",
      parentComponent: "11641003603040608708900000009090",
      positionComponent: "26026399100443509605233200085009",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`p`, {
      content: "`simplfy to make web be fast without leaving javascript for write HTML`",
      parentComponent: "11641003603040608708900000009090",
      positionComponent: "12700030792047048090100450945095",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                            `",
      parentComponent: "50311000070040099252162074084054",
      positionComponent: "10505600158040009224338420050029",
      state: {},
      event: {},
      attribute: {
        "class": "box"
      },
      id: ""
    }), dabMain.createRawComponent(`img`, {
      content: "``",
      parentComponent: "10505600158040009224338420050029",
      positionComponent: "11608200100040628478201870441093",
      state: {},
      event: {},
      attribute: {
        "src": seleku_kit_default
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "50311000070040099252162074084054",
      positionComponent: "77760008130647908130778068309323",
      state: {},
      event: {},
      attribute: {
        "class": "box"
      },
      id: ""
    }), dabMain.createRawComponent(`h1`, {
      content: "`By Daberdev`",
      parentComponent: "77760008130647908130778068309323",
      positionComponent: "15702017134945009132107004099022",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`p`, {
      content: "`framework ini merupakan framework buatan orang indonesia, dan memiliki tujuan utama                    untuk mempermudah para developer yang berasal dari indonesia                `",
      parentComponent: "77760008130647908130778068309323",
      positionComponent: "19702490100242688590887302048205",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "10259508001840059000040032609100",
      positionComponent: "10032086158640008040257723240900",
      state: {},
      event: {},
      attribute: {
        "class": "content"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "10032086158640008040257723240900",
      positionComponent: "1403288087034906a309634600960204",
      state: {},
      event: {},
      attribute: {
        "class": "box"
      },
      id: ""
    }), dabMain.createRawComponent(`h1`, {
      content: "`Reactive`",
      parentComponent: "1403288087034906a309634600960204",
      positionComponent: "5686018650004180a000661360001502",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`p`, {
      content: "`seleku kit menggunakan reaktivitas untuk melakukan update ui`",
      parentComponent: "1403288087034906a309634600960204",
      positionComponent: "13102600700040989850180109403060",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "10032086158640008040257723240900",
      positionComponent: "18122007185040608008200026007620",
      state: {},
      event: {},
      attribute: {
        "class": "box"
      },
      id: ""
    }), dabMain.createRawComponent(`h1`, {
      content: "`Web3`",
      parentComponent: "18122007185040608008200026007620",
      positionComponent: "1000100016804020a292900027232032",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`p`, {
      content: "`fitur utama dari seleku kit adalah web3 frontend, membuat website desentralisasi dengan blockchain`",
      parentComponent: "18122007185040608008200026007620",
      positionComponent: "11210010720047888622110000001700",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "10032086158640008040257723240900",
      positionComponent: "7060078040154253a090100970707052",
      state: {},
      event: {},
      attribute: {
        "class": "box"
      },
      id: ""
    }), dabMain.createRawComponent(`h1`, {
      content: "`Metaverse`",
      parentComponent: "7060078040154253a090100970707052",
      positionComponent: "08010403397341068085904558802090",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`p`, {
      content: "`dukungan penuh dalam pengembangan pemrograman berbasis grafis pada web dan pengembangan metaverse`",
      parentComponent: "7060078040154253a090100970707052",
      positionComponent: "15031073102440058009172070087149",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                    `",
      parentComponent: "10259508001840059000040032609100",
      positionComponent: "1283170010094000a506409930920108",
      state: {},
      event: {},
      attribute: {
        "class": "support"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                                            `",
      parentComponent: "1283170010094000a506409930920108",
      positionComponent: "54400000879040078030080021000030",
      state: {},
      event: {},
      attribute: {
        "class": "box"
      },
      id: ""
    }), dabMain.createRawComponent(`h1`, {
      content: "`Powerred By EsBuild`",
      parentComponent: "54400000879040078030080021000030",
      positionComponent: "91620000080349208900120650005240",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`img`, {
      content: "``",
      parentComponent: "54400000879040078030080021000030",
      positionComponent: "81000459120640068664102409900007",
      state: {},
      event: {},
      attribute: {
        "src": esbuild_default
      },
      id: ""
    }), dabMain.createRawComponent(`p`, {
      content: "`                    seleku kit berjalan diatas esbuild, esbuild sebagai bundler dan memungkinkan developer                    untuk melakukan banyak hal yang menjadi keterbatasan antara node js dengan frontend                `",
      parentComponent: "54400000879040078030080021000030",
      positionComponent: "4064688249074588a506101142007306",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                `",
      parentComponent: "10259508001840059000040032609100",
      positionComponent: "5394809925004013b300100910600530",
      state: {},
      event: {},
      attribute: {
        "class": "contributor"
      },
      id: ""
    }), dabMain.createRawComponent(`h1`, {
      content: "`All Contributor`",
      parentComponent: "5394809925004013b300100910600530",
      positionComponent: "8800809390724778b026103581400010",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), ...await AllContributor({
      "parentcomponent": "5394809925004013b300100910600530",
      "positioncomponent": "56010930199040008006192058102002"
    })];
  }

  // source/docs/syntax/index.selek
  function allDocs() {
    return [dabMain.createRawComponent(`div`, {
      content: "`                    `",
      parentComponent: "",
      positionComponent: "40008300670940568008086073028019",
      state: {},
      event: {},
      attribute: {
        "class": "hero"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "40008300670940568008086073028019",
      positionComponent: "20220446703047608390033603092400",
      state: {},
      event: {},
      attribute: {
        "class": "navbar"
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "20220446703047608390033603092400",
      positionComponent: "23900790110040609093773903950054",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    Home                `",
      parentComponent: "23900790110040609093773903950054",
      positionComponent: "1000618553004040a600900000006900",
      state: {},
      event: {},
      attribute: {
        "href": "/",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "20220446703047608390033603092400",
      positionComponent: "12379070100042109069107761300003",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    Docs                `",
      parentComponent: "12379070100042109069107761300003",
      positionComponent: "9900007281004006b229107071000003",
      state: {},
      event: {},
      attribute: {
        "href": "/docs",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "20220446703047608390033603092400",
      positionComponent: "1000040012354000a208763600012000",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    API                `",
      parentComponent: "1000040012354000a208763600012000",
      positionComponent: "17803007802642168840136000040693",
      state: {},
      event: {},
      attribute: {
        "href": "/api",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                `",
      parentComponent: "40008300670940568008086073028019",
      positionComponent: "10294003109745028014502060717309",
      state: {},
      event: {},
      attribute: {
        "class": "main-content"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`            `",
      parentComponent: "10294003109745028014502060717309",
      positionComponent: "40773905106042008400983520070400",
      state: {},
      event: {},
      attribute: {
        "class": "left showPanel"
      },
      id: "shortContent"
    }), dabMain.createRawComponent(`div`, {
      content: "`                            `",
      parentComponent: "10294003109745028014502060717309",
      positionComponent: "83303013508943008105505000433726",
      state: {},
      event: {},
      attribute: {
        "class": "right"
      },
      id: "allContent"
    })];
  }

  // node_modules/marked/lib/marked.esm.js
  function getDefaults() {
    return {
      baseUrl: null,
      breaks: false,
      extensions: null,
      gfm: true,
      headerIds: true,
      headerPrefix: "",
      highlight: null,
      langPrefix: "language-",
      mangle: true,
      pedantic: false,
      renderer: null,
      sanitize: false,
      sanitizer: null,
      silent: false,
      smartLists: false,
      smartypants: false,
      tokenizer: null,
      walkTokens: null,
      xhtml: false
    };
  }
  var defaults = getDefaults();
  function changeDefaults(newDefaults) {
    defaults = newDefaults;
  }
  var escapeTest = /[&<>"']/;
  var escapeReplace = /[&<>"']/g;
  var escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
  var escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
  var escapeReplacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  var getEscapeReplacement = (ch) => escapeReplacements[ch];
  function escape(html, encode) {
    if (encode) {
      if (escapeTest.test(html)) {
        return html.replace(escapeReplace, getEscapeReplacement);
      }
    } else {
      if (escapeTestNoEncode.test(html)) {
        return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
      }
    }
    return html;
  }
  var unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
  function unescape(html) {
    return html.replace(unescapeTest, (_, n) => {
      n = n.toLowerCase();
      if (n === "colon")
        return ":";
      if (n.charAt(0) === "#") {
        return n.charAt(1) === "x" ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
      }
      return "";
    });
  }
  var caret = /(^|[^\[])\^/g;
  function edit(regex, opt) {
    regex = regex.source || regex;
    opt = opt || "";
    const obj = {
      replace: (name, val) => {
        val = val.source || val;
        val = val.replace(caret, "$1");
        regex = regex.replace(name, val);
        return obj;
      },
      getRegex: () => {
        return new RegExp(regex, opt);
      }
    };
    return obj;
  }
  var nonWordAndColonTest = /[^\w:]/g;
  var originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
  function cleanUrl(sanitize, base, href) {
    if (sanitize) {
      let prot;
      try {
        prot = decodeURIComponent(unescape(href)).replace(nonWordAndColonTest, "").toLowerCase();
      } catch (e) {
        return null;
      }
      if (prot.indexOf("javascript:") === 0 || prot.indexOf("vbscript:") === 0 || prot.indexOf("data:") === 0) {
        return null;
      }
    }
    if (base && !originIndependentUrl.test(href)) {
      href = resolveUrl(base, href);
    }
    try {
      href = encodeURI(href).replace(/%25/g, "%");
    } catch (e) {
      return null;
    }
    return href;
  }
  var baseUrls = {};
  var justDomain = /^[^:]+:\/*[^/]*$/;
  var protocol = /^([^:]+:)[\s\S]*$/;
  var domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;
  function resolveUrl(base, href) {
    if (!baseUrls[" " + base]) {
      if (justDomain.test(base)) {
        baseUrls[" " + base] = base + "/";
      } else {
        baseUrls[" " + base] = rtrim(base, "/", true);
      }
    }
    base = baseUrls[" " + base];
    const relativeBase = base.indexOf(":") === -1;
    if (href.substring(0, 2) === "//") {
      if (relativeBase) {
        return href;
      }
      return base.replace(protocol, "$1") + href;
    } else if (href.charAt(0) === "/") {
      if (relativeBase) {
        return href;
      }
      return base.replace(domain, "$1") + href;
    } else {
      return base + href;
    }
  }
  var noopTest = { exec: function noopTest2() {
  } };
  function merge(obj) {
    let i = 1, target, key;
    for (; i < arguments.length; i++) {
      target = arguments[i];
      for (key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
          obj[key] = target[key];
        }
      }
    }
    return obj;
  }
  function splitCells(tableRow, count) {
    const row = tableRow.replace(/\|/g, (match, offset, str) => {
      let escaped = false, curr = offset;
      while (--curr >= 0 && str[curr] === "\\")
        escaped = !escaped;
      if (escaped) {
        return "|";
      } else {
        return " |";
      }
    }), cells = row.split(/ \|/);
    let i = 0;
    if (!cells[0].trim()) {
      cells.shift();
    }
    if (cells.length > 0 && !cells[cells.length - 1].trim()) {
      cells.pop();
    }
    if (cells.length > count) {
      cells.splice(count);
    } else {
      while (cells.length < count)
        cells.push("");
    }
    for (; i < cells.length; i++) {
      cells[i] = cells[i].trim().replace(/\\\|/g, "|");
    }
    return cells;
  }
  function rtrim(str, c, invert) {
    const l = str.length;
    if (l === 0) {
      return "";
    }
    let suffLen = 0;
    while (suffLen < l) {
      const currChar = str.charAt(l - suffLen - 1);
      if (currChar === c && !invert) {
        suffLen++;
      } else if (currChar !== c && invert) {
        suffLen++;
      } else {
        break;
      }
    }
    return str.substr(0, l - suffLen);
  }
  function findClosingBracket(str, b) {
    if (str.indexOf(b[1]) === -1) {
      return -1;
    }
    const l = str.length;
    let level = 0, i = 0;
    for (; i < l; i++) {
      if (str[i] === "\\") {
        i++;
      } else if (str[i] === b[0]) {
        level++;
      } else if (str[i] === b[1]) {
        level--;
        if (level < 0) {
          return i;
        }
      }
    }
    return -1;
  }
  function checkSanitizeDeprecation(opt) {
    if (opt && opt.sanitize && !opt.silent) {
      console.warn("marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options");
    }
  }
  function repeatString(pattern, count) {
    if (count < 1) {
      return "";
    }
    let result = "";
    while (count > 1) {
      if (count & 1) {
        result += pattern;
      }
      count >>= 1;
      pattern += pattern;
    }
    return result + pattern;
  }
  function outputLink(cap, link, raw, lexer2) {
    const href = link.href;
    const title = link.title ? escape(link.title) : null;
    const text2 = cap[1].replace(/\\([\[\]])/g, "$1");
    if (cap[0].charAt(0) !== "!") {
      lexer2.state.inLink = true;
      const token = {
        type: "link",
        raw,
        href,
        title,
        text: text2,
        tokens: lexer2.inlineTokens(text2, [])
      };
      lexer2.state.inLink = false;
      return token;
    } else {
      return {
        type: "image",
        raw,
        href,
        title,
        text: escape(text2)
      };
    }
  }
  function indentCodeCompensation(raw, text2) {
    const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
    if (matchIndentToCode === null) {
      return text2;
    }
    const indentToCode = matchIndentToCode[1];
    return text2.split("\n").map((node) => {
      const matchIndentInNode = node.match(/^\s+/);
      if (matchIndentInNode === null) {
        return node;
      }
      const [indentInNode] = matchIndentInNode;
      if (indentInNode.length >= indentToCode.length) {
        return node.slice(indentToCode.length);
      }
      return node;
    }).join("\n");
  }
  var Tokenizer = class {
    constructor(options2) {
      this.options = options2 || defaults;
    }
    space(src) {
      const cap = this.rules.block.newline.exec(src);
      if (cap && cap[0].length > 0) {
        return {
          type: "space",
          raw: cap[0]
        };
      }
    }
    code(src) {
      const cap = this.rules.block.code.exec(src);
      if (cap) {
        const text2 = cap[0].replace(/^ {1,4}/gm, "");
        return {
          type: "code",
          raw: cap[0],
          codeBlockStyle: "indented",
          text: !this.options.pedantic ? rtrim(text2, "\n") : text2
        };
      }
    }
    fences(src) {
      const cap = this.rules.block.fences.exec(src);
      if (cap) {
        const raw = cap[0];
        const text2 = indentCodeCompensation(raw, cap[3] || "");
        return {
          type: "code",
          raw,
          lang: cap[2] ? cap[2].trim() : cap[2],
          text: text2
        };
      }
    }
    heading(src) {
      const cap = this.rules.block.heading.exec(src);
      if (cap) {
        let text2 = cap[2].trim();
        if (/#$/.test(text2)) {
          const trimmed = rtrim(text2, "#");
          if (this.options.pedantic) {
            text2 = trimmed.trim();
          } else if (!trimmed || / $/.test(trimmed)) {
            text2 = trimmed.trim();
          }
        }
        const token = {
          type: "heading",
          raw: cap[0],
          depth: cap[1].length,
          text: text2,
          tokens: []
        };
        this.lexer.inline(token.text, token.tokens);
        return token;
      }
    }
    hr(src) {
      const cap = this.rules.block.hr.exec(src);
      if (cap) {
        return {
          type: "hr",
          raw: cap[0]
        };
      }
    }
    blockquote(src) {
      const cap = this.rules.block.blockquote.exec(src);
      if (cap) {
        const text2 = cap[0].replace(/^ *> ?/gm, "");
        return {
          type: "blockquote",
          raw: cap[0],
          tokens: this.lexer.blockTokens(text2, []),
          text: text2
        };
      }
    }
    list(src) {
      let cap = this.rules.block.list.exec(src);
      if (cap) {
        let raw, istask, ischecked, indent, i, blankLine, endsWithBlankLine, line, nextLine, rawLine, itemContents, endEarly;
        let bull = cap[1].trim();
        const isordered = bull.length > 1;
        const list = {
          type: "list",
          raw: "",
          ordered: isordered,
          start: isordered ? +bull.slice(0, -1) : "",
          loose: false,
          items: []
        };
        bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
        if (this.options.pedantic) {
          bull = isordered ? bull : "[*+-]";
        }
        const itemRegex = new RegExp(`^( {0,3}${bull})((?: [^\\n]*)?(?:\\n|$))`);
        while (src) {
          endEarly = false;
          if (!(cap = itemRegex.exec(src))) {
            break;
          }
          if (this.rules.block.hr.test(src)) {
            break;
          }
          raw = cap[0];
          src = src.substring(raw.length);
          line = cap[2].split("\n", 1)[0];
          nextLine = src.split("\n", 1)[0];
          if (this.options.pedantic) {
            indent = 2;
            itemContents = line.trimLeft();
          } else {
            indent = cap[2].search(/[^ ]/);
            indent = indent > 4 ? 1 : indent;
            itemContents = line.slice(indent);
            indent += cap[1].length;
          }
          blankLine = false;
          if (!line && /^ *$/.test(nextLine)) {
            raw += nextLine + "\n";
            src = src.substring(nextLine.length + 1);
            endEarly = true;
          }
          if (!endEarly) {
            const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])`);
            while (src) {
              rawLine = src.split("\n", 1)[0];
              line = rawLine;
              if (this.options.pedantic) {
                line = line.replace(/^ {1,4}(?=( {4})*[^ ])/g, "  ");
              }
              if (nextBulletRegex.test(line)) {
                break;
              }
              if (line.search(/[^ ]/) >= indent || !line.trim()) {
                itemContents += "\n" + line.slice(indent);
              } else if (!blankLine) {
                itemContents += "\n" + line;
              } else {
                break;
              }
              if (!blankLine && !line.trim()) {
                blankLine = true;
              }
              raw += rawLine + "\n";
              src = src.substring(rawLine.length + 1);
            }
          }
          if (!list.loose) {
            if (endsWithBlankLine) {
              list.loose = true;
            } else if (/\n *\n *$/.test(raw)) {
              endsWithBlankLine = true;
            }
          }
          if (this.options.gfm) {
            istask = /^\[[ xX]\] /.exec(itemContents);
            if (istask) {
              ischecked = istask[0] !== "[ ] ";
              itemContents = itemContents.replace(/^\[[ xX]\] +/, "");
            }
          }
          list.items.push({
            type: "list_item",
            raw,
            task: !!istask,
            checked: ischecked,
            loose: false,
            text: itemContents
          });
          list.raw += raw;
        }
        list.items[list.items.length - 1].raw = raw.trimRight();
        list.items[list.items.length - 1].text = itemContents.trimRight();
        list.raw = list.raw.trimRight();
        const l = list.items.length;
        for (i = 0; i < l; i++) {
          this.lexer.state.top = false;
          list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
          const spacers = list.items[i].tokens.filter((t) => t.type === "space");
          const hasMultipleLineBreaks = spacers.every((t) => {
            const chars = t.raw.split("");
            let lineBreaks = 0;
            for (const char of chars) {
              if (char === "\n") {
                lineBreaks += 1;
              }
              if (lineBreaks > 1) {
                return true;
              }
            }
            return false;
          });
          if (!list.loose && spacers.length && hasMultipleLineBreaks) {
            list.loose = true;
            list.items[i].loose = true;
          }
        }
        return list;
      }
    }
    html(src) {
      const cap = this.rules.block.html.exec(src);
      if (cap) {
        const token = {
          type: "html",
          raw: cap[0],
          pre: !this.options.sanitizer && (cap[1] === "pre" || cap[1] === "script" || cap[1] === "style"),
          text: cap[0]
        };
        if (this.options.sanitize) {
          token.type = "paragraph";
          token.text = this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]);
          token.tokens = [];
          this.lexer.inline(token.text, token.tokens);
        }
        return token;
      }
    }
    def(src) {
      const cap = this.rules.block.def.exec(src);
      if (cap) {
        if (cap[3])
          cap[3] = cap[3].substring(1, cap[3].length - 1);
        const tag = cap[1].toLowerCase().replace(/\s+/g, " ");
        return {
          type: "def",
          tag,
          raw: cap[0],
          href: cap[2],
          title: cap[3]
        };
      }
    }
    table(src) {
      const cap = this.rules.block.table.exec(src);
      if (cap) {
        const item = {
          type: "table",
          header: splitCells(cap[1]).map((c) => {
            return { text: c };
          }),
          align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
          rows: cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, "").split("\n") : []
        };
        if (item.header.length === item.align.length) {
          item.raw = cap[0];
          let l = item.align.length;
          let i, j, k, row;
          for (i = 0; i < l; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = "right";
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = "center";
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = "left";
            } else {
              item.align[i] = null;
            }
          }
          l = item.rows.length;
          for (i = 0; i < l; i++) {
            item.rows[i] = splitCells(item.rows[i], item.header.length).map((c) => {
              return { text: c };
            });
          }
          l = item.header.length;
          for (j = 0; j < l; j++) {
            item.header[j].tokens = [];
            this.lexer.inlineTokens(item.header[j].text, item.header[j].tokens);
          }
          l = item.rows.length;
          for (j = 0; j < l; j++) {
            row = item.rows[j];
            for (k = 0; k < row.length; k++) {
              row[k].tokens = [];
              this.lexer.inlineTokens(row[k].text, row[k].tokens);
            }
          }
          return item;
        }
      }
    }
    lheading(src) {
      const cap = this.rules.block.lheading.exec(src);
      if (cap) {
        const token = {
          type: "heading",
          raw: cap[0],
          depth: cap[2].charAt(0) === "=" ? 1 : 2,
          text: cap[1],
          tokens: []
        };
        this.lexer.inline(token.text, token.tokens);
        return token;
      }
    }
    paragraph(src) {
      const cap = this.rules.block.paragraph.exec(src);
      if (cap) {
        const token = {
          type: "paragraph",
          raw: cap[0],
          text: cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1],
          tokens: []
        };
        this.lexer.inline(token.text, token.tokens);
        return token;
      }
    }
    text(src) {
      const cap = this.rules.block.text.exec(src);
      if (cap) {
        const token = {
          type: "text",
          raw: cap[0],
          text: cap[0],
          tokens: []
        };
        this.lexer.inline(token.text, token.tokens);
        return token;
      }
    }
    escape(src) {
      const cap = this.rules.inline.escape.exec(src);
      if (cap) {
        return {
          type: "escape",
          raw: cap[0],
          text: escape(cap[1])
        };
      }
    }
    tag(src) {
      const cap = this.rules.inline.tag.exec(src);
      if (cap) {
        if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
          this.lexer.state.inLink = true;
        } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
          this.lexer.state.inLink = false;
        }
        if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.lexer.state.inRawBlock = true;
        } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.lexer.state.inRawBlock = false;
        }
        return {
          type: this.options.sanitize ? "text" : "html",
          raw: cap[0],
          inLink: this.lexer.state.inLink,
          inRawBlock: this.lexer.state.inRawBlock,
          text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0]
        };
      }
    }
    link(src) {
      const cap = this.rules.inline.link.exec(src);
      if (cap) {
        const trimmedUrl = cap[2].trim();
        if (!this.options.pedantic && /^</.test(trimmedUrl)) {
          if (!/>$/.test(trimmedUrl)) {
            return;
          }
          const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
          if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
            return;
          }
        } else {
          const lastParenIndex = findClosingBracket(cap[2], "()");
          if (lastParenIndex > -1) {
            const start = cap[0].indexOf("!") === 0 ? 5 : 4;
            const linkLen = start + cap[1].length + lastParenIndex;
            cap[2] = cap[2].substring(0, lastParenIndex);
            cap[0] = cap[0].substring(0, linkLen).trim();
            cap[3] = "";
          }
        }
        let href = cap[2];
        let title = "";
        if (this.options.pedantic) {
          const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
          if (link) {
            href = link[1];
            title = link[3];
          }
        } else {
          title = cap[3] ? cap[3].slice(1, -1) : "";
        }
        href = href.trim();
        if (/^</.test(href)) {
          if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
            href = href.slice(1);
          } else {
            href = href.slice(1, -1);
          }
        }
        return outputLink(cap, {
          href: href ? href.replace(this.rules.inline._escapes, "$1") : href,
          title: title ? title.replace(this.rules.inline._escapes, "$1") : title
        }, cap[0], this.lexer);
      }
    }
    reflink(src, links) {
      let cap;
      if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
        let link = (cap[2] || cap[1]).replace(/\s+/g, " ");
        link = links[link.toLowerCase()];
        if (!link || !link.href) {
          const text2 = cap[0].charAt(0);
          return {
            type: "text",
            raw: text2,
            text: text2
          };
        }
        return outputLink(cap, link, cap[0], this.lexer);
      }
    }
    emStrong(src, maskedSrc, prevChar = "") {
      let match = this.rules.inline.emStrong.lDelim.exec(src);
      if (!match)
        return;
      if (match[3] && prevChar.match(/[\p{L}\p{N}]/u))
        return;
      const nextChar = match[1] || match[2] || "";
      if (!nextChar || nextChar && (prevChar === "" || this.rules.inline.punctuation.exec(prevChar))) {
        const lLength = match[0].length - 1;
        let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
        const endReg = match[0][0] === "*" ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
        endReg.lastIndex = 0;
        maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
        while ((match = endReg.exec(maskedSrc)) != null) {
          rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
          if (!rDelim)
            continue;
          rLength = rDelim.length;
          if (match[3] || match[4]) {
            delimTotal += rLength;
            continue;
          } else if (match[5] || match[6]) {
            if (lLength % 3 && !((lLength + rLength) % 3)) {
              midDelimTotal += rLength;
              continue;
            }
          }
          delimTotal -= rLength;
          if (delimTotal > 0)
            continue;
          rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
          if (Math.min(lLength, rLength) % 2) {
            const text3 = src.slice(1, lLength + match.index + rLength);
            return {
              type: "em",
              raw: src.slice(0, lLength + match.index + rLength + 1),
              text: text3,
              tokens: this.lexer.inlineTokens(text3, [])
            };
          }
          const text2 = src.slice(2, lLength + match.index + rLength - 1);
          return {
            type: "strong",
            raw: src.slice(0, lLength + match.index + rLength + 1),
            text: text2,
            tokens: this.lexer.inlineTokens(text2, [])
          };
        }
      }
    }
    codespan(src) {
      const cap = this.rules.inline.code.exec(src);
      if (cap) {
        let text2 = cap[2].replace(/\n/g, " ");
        const hasNonSpaceChars = /[^ ]/.test(text2);
        const hasSpaceCharsOnBothEnds = /^ /.test(text2) && / $/.test(text2);
        if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
          text2 = text2.substring(1, text2.length - 1);
        }
        text2 = escape(text2, true);
        return {
          type: "codespan",
          raw: cap[0],
          text: text2
        };
      }
    }
    br(src) {
      const cap = this.rules.inline.br.exec(src);
      if (cap) {
        return {
          type: "br",
          raw: cap[0]
        };
      }
    }
    del(src) {
      const cap = this.rules.inline.del.exec(src);
      if (cap) {
        return {
          type: "del",
          raw: cap[0],
          text: cap[2],
          tokens: this.lexer.inlineTokens(cap[2], [])
        };
      }
    }
    autolink(src, mangle2) {
      const cap = this.rules.inline.autolink.exec(src);
      if (cap) {
        let text2, href;
        if (cap[2] === "@") {
          text2 = escape(this.options.mangle ? mangle2(cap[1]) : cap[1]);
          href = "mailto:" + text2;
        } else {
          text2 = escape(cap[1]);
          href = text2;
        }
        return {
          type: "link",
          raw: cap[0],
          text: text2,
          href,
          tokens: [
            {
              type: "text",
              raw: text2,
              text: text2
            }
          ]
        };
      }
    }
    url(src, mangle2) {
      let cap;
      if (cap = this.rules.inline.url.exec(src)) {
        let text2, href;
        if (cap[2] === "@") {
          text2 = escape(this.options.mangle ? mangle2(cap[0]) : cap[0]);
          href = "mailto:" + text2;
        } else {
          let prevCapZero;
          do {
            prevCapZero = cap[0];
            cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
          } while (prevCapZero !== cap[0]);
          text2 = escape(cap[0]);
          if (cap[1] === "www.") {
            href = "http://" + text2;
          } else {
            href = text2;
          }
        }
        return {
          type: "link",
          raw: cap[0],
          text: text2,
          href,
          tokens: [
            {
              type: "text",
              raw: text2,
              text: text2
            }
          ]
        };
      }
    }
    inlineText(src, smartypants2) {
      const cap = this.rules.inline.text.exec(src);
      if (cap) {
        let text2;
        if (this.lexer.state.inRawBlock) {
          text2 = this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0];
        } else {
          text2 = escape(this.options.smartypants ? smartypants2(cap[0]) : cap[0]);
        }
        return {
          type: "text",
          raw: cap[0],
          text: text2
        };
      }
    }
  };
  var block = {
    newline: /^(?: *(?:\n|$))+/,
    code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
    fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
    hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
    heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
    blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
    list: /^( {0,3}bull)( [^\n]+?)?(?:\n|$)/,
    html: "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$))",
    def: /^ {0,3}\[(label)\]: *(?:\n *)?<?([^\s>]+)>?(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/,
    table: noopTest,
    lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
    _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
    text: /^[^\n]+/
  };
  block._label = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
  block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
  block.def = edit(block.def).replace("label", block._label).replace("title", block._title).getRegex();
  block.bullet = /(?:[*+-]|\d{1,9}[.)])/;
  block.listItemStart = edit(/^( *)(bull) */).replace("bull", block.bullet).getRegex();
  block.list = edit(block.list).replace(/bull/g, block.bullet).replace("hr", "\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))").replace("def", "\\n+(?=" + block.def.source + ")").getRegex();
  block._tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
  block._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
  block.html = edit(block.html, "i").replace("comment", block._comment).replace("tag", block._tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
  block.paragraph = edit(block._paragraph).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
  block.blockquote = edit(block.blockquote).replace("paragraph", block.paragraph).getRegex();
  block.normal = merge({}, block);
  block.gfm = merge({}, block.normal, {
    table: "^ *([^\\n ].*\\|.*)\\n {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
  });
  block.gfm.table = edit(block.gfm.table).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("blockquote", " {0,3}>").replace("code", " {4}[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
  block.gfm.paragraph = edit(block._paragraph).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("table", block.gfm.table).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
  block.pedantic = merge({}, block.normal, {
    html: edit(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", block._comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
    heading: /^(#{1,6})(.*)(?:\n+|$)/,
    fences: noopTest,
    paragraph: edit(block.normal._paragraph).replace("hr", block.hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", block.lheading).replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").getRegex()
  });
  var inline = {
    escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
    autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
    url: noopTest,
    tag: "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
    link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
    reflink: /^!?\[(label)\]\[(ref)\]/,
    nolink: /^!?\[(ref)\](?:\[\])?/,
    reflinkSearch: "reflink|nolink(?!\\()",
    emStrong: {
      lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
      rDelimAst: /^[^_*]*?\_\_[^_*]*?\*[^_*]*?(?=\_\_)|[punct_](\*+)(?=[\s]|$)|[^punct*_\s](\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|[^punct*_\s](\*+)(?=[^punct*_\s])/,
      rDelimUnd: /^[^_*]*?\*\*[^_*]*?\_[^_*]*?(?=\*\*)|[punct*](\_+)(?=[\s]|$)|[^punct*_\s](\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/
    },
    code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
    br: /^( {2,}|\\)\n(?!\s*$)/,
    del: noopTest,
    text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
    punctuation: /^([\spunctuation])/
  };
  inline._punctuation = "!\"#$%&'()+\\-.,/:;<=>?@\\[\\]`^{|}~";
  inline.punctuation = edit(inline.punctuation).replace(/punctuation/g, inline._punctuation).getRegex();
  inline.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g;
  inline.escapedEmSt = /\\\*|\\_/g;
  inline._comment = edit(block._comment).replace("(?:-->|$)", "-->").getRegex();
  inline.emStrong.lDelim = edit(inline.emStrong.lDelim).replace(/punct/g, inline._punctuation).getRegex();
  inline.emStrong.rDelimAst = edit(inline.emStrong.rDelimAst, "g").replace(/punct/g, inline._punctuation).getRegex();
  inline.emStrong.rDelimUnd = edit(inline.emStrong.rDelimUnd, "g").replace(/punct/g, inline._punctuation).getRegex();
  inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;
  inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
  inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
  inline.autolink = edit(inline.autolink).replace("scheme", inline._scheme).replace("email", inline._email).getRegex();
  inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;
  inline.tag = edit(inline.tag).replace("comment", inline._comment).replace("attribute", inline._attribute).getRegex();
  inline._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
  inline._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
  inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;
  inline.link = edit(inline.link).replace("label", inline._label).replace("href", inline._href).replace("title", inline._title).getRegex();
  inline.reflink = edit(inline.reflink).replace("label", inline._label).replace("ref", block._label).getRegex();
  inline.nolink = edit(inline.nolink).replace("ref", block._label).getRegex();
  inline.reflinkSearch = edit(inline.reflinkSearch, "g").replace("reflink", inline.reflink).replace("nolink", inline.nolink).getRegex();
  inline.normal = merge({}, inline);
  inline.pedantic = merge({}, inline.normal, {
    strong: {
      start: /^__|\*\*/,
      middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
      endAst: /\*\*(?!\*)/g,
      endUnd: /__(?!_)/g
    },
    em: {
      start: /^_|\*/,
      middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
      endAst: /\*(?!\*)/g,
      endUnd: /_(?!_)/g
    },
    link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", inline._label).getRegex(),
    reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", inline._label).getRegex()
  });
  inline.gfm = merge({}, inline.normal, {
    escape: edit(inline.escape).replace("])", "~|])").getRegex(),
    _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
    url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
    _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
    del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
    text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
  });
  inline.gfm.url = edit(inline.gfm.url, "i").replace("email", inline.gfm._extended_email).getRegex();
  inline.breaks = merge({}, inline.gfm, {
    br: edit(inline.br).replace("{2,}", "*").getRegex(),
    text: edit(inline.gfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
  });
  function smartypants(text2) {
    return text2.replace(/---/g, "\u2014").replace(/--/g, "\u2013").replace(/(^|[-\u2014/(\[{"\s])'/g, "$1\u2018").replace(/'/g, "\u2019").replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1\u201C").replace(/"/g, "\u201D").replace(/\.{3}/g, "\u2026");
  }
  function mangle(text2) {
    let out = "", i, ch;
    const l = text2.length;
    for (i = 0; i < l; i++) {
      ch = text2.charCodeAt(i);
      if (Math.random() > 0.5) {
        ch = "x" + ch.toString(16);
      }
      out += "&#" + ch + ";";
    }
    return out;
  }
  var Lexer = class {
    constructor(options2) {
      this.tokens = [];
      this.tokens.links = /* @__PURE__ */ Object.create(null);
      this.options = options2 || defaults;
      this.options.tokenizer = this.options.tokenizer || new Tokenizer();
      this.tokenizer = this.options.tokenizer;
      this.tokenizer.options = this.options;
      this.tokenizer.lexer = this;
      this.inlineQueue = [];
      this.state = {
        inLink: false,
        inRawBlock: false,
        top: true
      };
      const rules = {
        block: block.normal,
        inline: inline.normal
      };
      if (this.options.pedantic) {
        rules.block = block.pedantic;
        rules.inline = inline.pedantic;
      } else if (this.options.gfm) {
        rules.block = block.gfm;
        if (this.options.breaks) {
          rules.inline = inline.breaks;
        } else {
          rules.inline = inline.gfm;
        }
      }
      this.tokenizer.rules = rules;
    }
    static get rules() {
      return {
        block,
        inline
      };
    }
    static lex(src, options2) {
      const lexer2 = new Lexer(options2);
      return lexer2.lex(src);
    }
    static lexInline(src, options2) {
      const lexer2 = new Lexer(options2);
      return lexer2.inlineTokens(src);
    }
    lex(src) {
      src = src.replace(/\r\n|\r/g, "\n").replace(/\t/g, "    ");
      this.blockTokens(src, this.tokens);
      let next;
      while (next = this.inlineQueue.shift()) {
        this.inlineTokens(next.src, next.tokens);
      }
      return this.tokens;
    }
    blockTokens(src, tokens = []) {
      if (this.options.pedantic) {
        src = src.replace(/^ +$/gm, "");
      }
      let token, lastToken, cutSrc, lastParagraphClipped;
      while (src) {
        if (this.options.extensions && this.options.extensions.block && this.options.extensions.block.some((extTokenizer) => {
          if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            return true;
          }
          return false;
        })) {
          continue;
        }
        if (token = this.tokenizer.space(src)) {
          src = src.substring(token.raw.length);
          if (token.raw.length === 1 && tokens.length > 0) {
            tokens[tokens.length - 1].raw += "\n";
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (token = this.tokenizer.code(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
            lastToken.raw += "\n" + token.raw;
            lastToken.text += "\n" + token.text;
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (token = this.tokenizer.fences(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.heading(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.hr(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.blockquote(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.list(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.html(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.def(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
            lastToken.raw += "\n" + token.raw;
            lastToken.text += "\n" + token.raw;
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else if (!this.tokens.links[token.tag]) {
            this.tokens.links[token.tag] = {
              href: token.href,
              title: token.title
            };
          }
          continue;
        }
        if (token = this.tokenizer.table(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.lheading(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        cutSrc = src;
        if (this.options.extensions && this.options.extensions.startBlock) {
          let startIndex = Infinity;
          const tempSrc = src.slice(1);
          let tempStart;
          this.options.extensions.startBlock.forEach(function(getStartIndex) {
            tempStart = getStartIndex.call({ lexer: this }, tempSrc);
            if (typeof tempStart === "number" && tempStart >= 0) {
              startIndex = Math.min(startIndex, tempStart);
            }
          });
          if (startIndex < Infinity && startIndex >= 0) {
            cutSrc = src.substring(0, startIndex + 1);
          }
        }
        if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
          lastToken = tokens[tokens.length - 1];
          if (lastParagraphClipped && lastToken.type === "paragraph") {
            lastToken.raw += "\n" + token.raw;
            lastToken.text += "\n" + token.text;
            this.inlineQueue.pop();
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          lastParagraphClipped = cutSrc.length !== src.length;
          src = src.substring(token.raw.length);
          continue;
        }
        if (token = this.tokenizer.text(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && lastToken.type === "text") {
            lastToken.raw += "\n" + token.raw;
            lastToken.text += "\n" + token.text;
            this.inlineQueue.pop();
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (src) {
          const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
          if (this.options.silent) {
            console.error(errMsg);
            break;
          } else {
            throw new Error(errMsg);
          }
        }
      }
      this.state.top = true;
      return tokens;
    }
    inline(src, tokens) {
      this.inlineQueue.push({ src, tokens });
    }
    inlineTokens(src, tokens = []) {
      let token, lastToken, cutSrc;
      let maskedSrc = src;
      let match;
      let keepPrevChar, prevChar;
      if (this.tokens.links) {
        const links = Object.keys(this.tokens.links);
        if (links.length > 0) {
          while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
            if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
              maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
            }
          }
        }
      }
      while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
        maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
      }
      while ((match = this.tokenizer.rules.inline.escapedEmSt.exec(maskedSrc)) != null) {
        maskedSrc = maskedSrc.slice(0, match.index) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
      }
      while (src) {
        if (!keepPrevChar) {
          prevChar = "";
        }
        keepPrevChar = false;
        if (this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some((extTokenizer) => {
          if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            return true;
          }
          return false;
        })) {
          continue;
        }
        if (token = this.tokenizer.escape(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.tag(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && token.type === "text" && lastToken.type === "text") {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (token = this.tokenizer.link(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.reflink(src, this.tokens.links)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && token.type === "text" && lastToken.type === "text") {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.codespan(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.br(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.del(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.autolink(src, mangle)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (!this.state.inLink && (token = this.tokenizer.url(src, mangle))) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        cutSrc = src;
        if (this.options.extensions && this.options.extensions.startInline) {
          let startIndex = Infinity;
          const tempSrc = src.slice(1);
          let tempStart;
          this.options.extensions.startInline.forEach(function(getStartIndex) {
            tempStart = getStartIndex.call({ lexer: this }, tempSrc);
            if (typeof tempStart === "number" && tempStart >= 0) {
              startIndex = Math.min(startIndex, tempStart);
            }
          });
          if (startIndex < Infinity && startIndex >= 0) {
            cutSrc = src.substring(0, startIndex + 1);
          }
        }
        if (token = this.tokenizer.inlineText(cutSrc, smartypants)) {
          src = src.substring(token.raw.length);
          if (token.raw.slice(-1) !== "_") {
            prevChar = token.raw.slice(-1);
          }
          keepPrevChar = true;
          lastToken = tokens[tokens.length - 1];
          if (lastToken && lastToken.type === "text") {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (src) {
          const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
          if (this.options.silent) {
            console.error(errMsg);
            break;
          } else {
            throw new Error(errMsg);
          }
        }
      }
      return tokens;
    }
  };
  var Renderer = class {
    constructor(options2) {
      this.options = options2 || defaults;
    }
    code(code, infostring, escaped) {
      const lang = (infostring || "").match(/\S*/)[0];
      if (this.options.highlight) {
        const out = this.options.highlight(code, lang);
        if (out != null && out !== code) {
          escaped = true;
          code = out;
        }
      }
      code = code.replace(/\n$/, "") + "\n";
      if (!lang) {
        return "<pre><code>" + (escaped ? code : escape(code, true)) + "</code></pre>\n";
      }
      return '<pre><code class="' + this.options.langPrefix + escape(lang, true) + '">' + (escaped ? code : escape(code, true)) + "</code></pre>\n";
    }
    blockquote(quote) {
      return "<blockquote>\n" + quote + "</blockquote>\n";
    }
    html(html) {
      return html;
    }
    heading(text2, level, raw, slugger) {
      if (this.options.headerIds) {
        return "<h" + level + ' id="' + this.options.headerPrefix + slugger.slug(raw) + '">' + text2 + "</h" + level + ">\n";
      }
      return "<h" + level + ">" + text2 + "</h" + level + ">\n";
    }
    hr() {
      return this.options.xhtml ? "<hr/>\n" : "<hr>\n";
    }
    list(body, ordered, start) {
      const type = ordered ? "ol" : "ul", startatt = ordered && start !== 1 ? ' start="' + start + '"' : "";
      return "<" + type + startatt + ">\n" + body + "</" + type + ">\n";
    }
    listitem(text2) {
      return "<li>" + text2 + "</li>\n";
    }
    checkbox(checked) {
      return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox"' + (this.options.xhtml ? " /" : "") + "> ";
    }
    paragraph(text2) {
      return "<p>" + text2 + "</p>\n";
    }
    table(header, body) {
      if (body)
        body = "<tbody>" + body + "</tbody>";
      return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
    }
    tablerow(content) {
      return "<tr>\n" + content + "</tr>\n";
    }
    tablecell(content, flags) {
      const type = flags.header ? "th" : "td";
      const tag = flags.align ? "<" + type + ' align="' + flags.align + '">' : "<" + type + ">";
      return tag + content + "</" + type + ">\n";
    }
    strong(text2) {
      return "<strong>" + text2 + "</strong>";
    }
    em(text2) {
      return "<em>" + text2 + "</em>";
    }
    codespan(text2) {
      return "<code>" + text2 + "</code>";
    }
    br() {
      return this.options.xhtml ? "<br/>" : "<br>";
    }
    del(text2) {
      return "<del>" + text2 + "</del>";
    }
    link(href, title, text2) {
      href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
      if (href === null) {
        return text2;
      }
      let out = '<a href="' + escape(href) + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += ">" + text2 + "</a>";
      return out;
    }
    image(href, title, text2) {
      href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
      if (href === null) {
        return text2;
      }
      let out = '<img src="' + href + '" alt="' + text2 + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += this.options.xhtml ? "/>" : ">";
      return out;
    }
    text(text2) {
      return text2;
    }
  };
  var TextRenderer = class {
    strong(text2) {
      return text2;
    }
    em(text2) {
      return text2;
    }
    codespan(text2) {
      return text2;
    }
    del(text2) {
      return text2;
    }
    html(text2) {
      return text2;
    }
    text(text2) {
      return text2;
    }
    link(href, title, text2) {
      return "" + text2;
    }
    image(href, title, text2) {
      return "" + text2;
    }
    br() {
      return "";
    }
  };
  var Slugger = class {
    constructor() {
      this.seen = {};
    }
    serialize(value) {
      return value.toLowerCase().trim().replace(/<[!\/a-z].*?>/ig, "").replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "").replace(/\s/g, "-");
    }
    getNextSafeSlug(originalSlug, isDryRun) {
      let slug = originalSlug;
      let occurenceAccumulator = 0;
      if (this.seen.hasOwnProperty(slug)) {
        occurenceAccumulator = this.seen[originalSlug];
        do {
          occurenceAccumulator++;
          slug = originalSlug + "-" + occurenceAccumulator;
        } while (this.seen.hasOwnProperty(slug));
      }
      if (!isDryRun) {
        this.seen[originalSlug] = occurenceAccumulator;
        this.seen[slug] = 0;
      }
      return slug;
    }
    slug(value, options2 = {}) {
      const slug = this.serialize(value);
      return this.getNextSafeSlug(slug, options2.dryrun);
    }
  };
  var Parser = class {
    constructor(options2) {
      this.options = options2 || defaults;
      this.options.renderer = this.options.renderer || new Renderer();
      this.renderer = this.options.renderer;
      this.renderer.options = this.options;
      this.textRenderer = new TextRenderer();
      this.slugger = new Slugger();
    }
    static parse(tokens, options2) {
      const parser2 = new Parser(options2);
      return parser2.parse(tokens);
    }
    static parseInline(tokens, options2) {
      const parser2 = new Parser(options2);
      return parser2.parseInline(tokens);
    }
    parse(tokens, top = true) {
      let out = "", i, j, k, l2, l3, row, cell, header, body, token, ordered, start, loose, itemBody, item, checked, task, checkbox, ret;
      const l = tokens.length;
      for (i = 0; i < l; i++) {
        token = tokens[i];
        if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
          ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
          if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(token.type)) {
            out += ret || "";
            continue;
          }
        }
        switch (token.type) {
          case "space": {
            continue;
          }
          case "hr": {
            out += this.renderer.hr();
            continue;
          }
          case "heading": {
            out += this.renderer.heading(this.parseInline(token.tokens), token.depth, unescape(this.parseInline(token.tokens, this.textRenderer)), this.slugger);
            continue;
          }
          case "code": {
            out += this.renderer.code(token.text, token.lang, token.escaped);
            continue;
          }
          case "table": {
            header = "";
            cell = "";
            l2 = token.header.length;
            for (j = 0; j < l2; j++) {
              cell += this.renderer.tablecell(this.parseInline(token.header[j].tokens), { header: true, align: token.align[j] });
            }
            header += this.renderer.tablerow(cell);
            body = "";
            l2 = token.rows.length;
            for (j = 0; j < l2; j++) {
              row = token.rows[j];
              cell = "";
              l3 = row.length;
              for (k = 0; k < l3; k++) {
                cell += this.renderer.tablecell(this.parseInline(row[k].tokens), { header: false, align: token.align[k] });
              }
              body += this.renderer.tablerow(cell);
            }
            out += this.renderer.table(header, body);
            continue;
          }
          case "blockquote": {
            body = this.parse(token.tokens);
            out += this.renderer.blockquote(body);
            continue;
          }
          case "list": {
            ordered = token.ordered;
            start = token.start;
            loose = token.loose;
            l2 = token.items.length;
            body = "";
            for (j = 0; j < l2; j++) {
              item = token.items[j];
              checked = item.checked;
              task = item.task;
              itemBody = "";
              if (item.task) {
                checkbox = this.renderer.checkbox(checked);
                if (loose) {
                  if (item.tokens.length > 0 && item.tokens[0].type === "paragraph") {
                    item.tokens[0].text = checkbox + " " + item.tokens[0].text;
                    if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
                      item.tokens[0].tokens[0].text = checkbox + " " + item.tokens[0].tokens[0].text;
                    }
                  } else {
                    item.tokens.unshift({
                      type: "text",
                      text: checkbox
                    });
                  }
                } else {
                  itemBody += checkbox;
                }
              }
              itemBody += this.parse(item.tokens, loose);
              body += this.renderer.listitem(itemBody, task, checked);
            }
            out += this.renderer.list(body, ordered, start);
            continue;
          }
          case "html": {
            out += this.renderer.html(token.text);
            continue;
          }
          case "paragraph": {
            out += this.renderer.paragraph(this.parseInline(token.tokens));
            continue;
          }
          case "text": {
            body = token.tokens ? this.parseInline(token.tokens) : token.text;
            while (i + 1 < l && tokens[i + 1].type === "text") {
              token = tokens[++i];
              body += "\n" + (token.tokens ? this.parseInline(token.tokens) : token.text);
            }
            out += top ? this.renderer.paragraph(body) : body;
            continue;
          }
          default: {
            const errMsg = 'Token with "' + token.type + '" type was not found.';
            if (this.options.silent) {
              console.error(errMsg);
              return;
            } else {
              throw new Error(errMsg);
            }
          }
        }
      }
      return out;
    }
    parseInline(tokens, renderer) {
      renderer = renderer || this.renderer;
      let out = "", i, token, ret;
      const l = tokens.length;
      for (i = 0; i < l; i++) {
        token = tokens[i];
        if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
          ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
          if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(token.type)) {
            out += ret || "";
            continue;
          }
        }
        switch (token.type) {
          case "escape": {
            out += renderer.text(token.text);
            break;
          }
          case "html": {
            out += renderer.html(token.text);
            break;
          }
          case "link": {
            out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
            break;
          }
          case "image": {
            out += renderer.image(token.href, token.title, token.text);
            break;
          }
          case "strong": {
            out += renderer.strong(this.parseInline(token.tokens, renderer));
            break;
          }
          case "em": {
            out += renderer.em(this.parseInline(token.tokens, renderer));
            break;
          }
          case "codespan": {
            out += renderer.codespan(token.text);
            break;
          }
          case "br": {
            out += renderer.br();
            break;
          }
          case "del": {
            out += renderer.del(this.parseInline(token.tokens, renderer));
            break;
          }
          case "text": {
            out += renderer.text(token.text);
            break;
          }
          default: {
            const errMsg = 'Token with "' + token.type + '" type was not found.';
            if (this.options.silent) {
              console.error(errMsg);
              return;
            } else {
              throw new Error(errMsg);
            }
          }
        }
      }
      return out;
    }
  };
  function marked(src, opt, callback) {
    if (typeof src === "undefined" || src === null) {
      throw new Error("marked(): input parameter is undefined or null");
    }
    if (typeof src !== "string") {
      throw new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected");
    }
    if (typeof opt === "function") {
      callback = opt;
      opt = null;
    }
    opt = merge({}, marked.defaults, opt || {});
    checkSanitizeDeprecation(opt);
    if (callback) {
      const highlight = opt.highlight;
      let tokens;
      try {
        tokens = Lexer.lex(src, opt);
      } catch (e) {
        return callback(e);
      }
      const done = function(err) {
        let out;
        if (!err) {
          try {
            if (opt.walkTokens) {
              marked.walkTokens(tokens, opt.walkTokens);
            }
            out = Parser.parse(tokens, opt);
          } catch (e) {
            err = e;
          }
        }
        opt.highlight = highlight;
        return err ? callback(err) : callback(null, out);
      };
      if (!highlight || highlight.length < 3) {
        return done();
      }
      delete opt.highlight;
      if (!tokens.length)
        return done();
      let pending = 0;
      marked.walkTokens(tokens, function(token) {
        if (token.type === "code") {
          pending++;
          setTimeout(() => {
            highlight(token.text, token.lang, function(err, code) {
              if (err) {
                return done(err);
              }
              if (code != null && code !== token.text) {
                token.text = code;
                token.escaped = true;
              }
              pending--;
              if (pending === 0) {
                done();
              }
            });
          }, 0);
        }
      });
      if (pending === 0) {
        done();
      }
      return;
    }
    try {
      const tokens = Lexer.lex(src, opt);
      if (opt.walkTokens) {
        marked.walkTokens(tokens, opt.walkTokens);
      }
      return Parser.parse(tokens, opt);
    } catch (e) {
      e.message += "\nPlease report this to https://github.com/markedjs/marked.";
      if (opt.silent) {
        return "<p>An error occurred:</p><pre>" + escape(e.message + "", true) + "</pre>";
      }
      throw e;
    }
  }
  marked.options = marked.setOptions = function(opt) {
    merge(marked.defaults, opt);
    changeDefaults(marked.defaults);
    return marked;
  };
  marked.getDefaults = getDefaults;
  marked.defaults = defaults;
  marked.use = function(...args) {
    const opts = merge({}, ...args);
    const extensions = marked.defaults.extensions || { renderers: {}, childTokens: {} };
    let hasExtensions;
    args.forEach((pack) => {
      if (pack.extensions) {
        hasExtensions = true;
        pack.extensions.forEach((ext) => {
          if (!ext.name) {
            throw new Error("extension name required");
          }
          if (ext.renderer) {
            const prevRenderer = extensions.renderers ? extensions.renderers[ext.name] : null;
            if (prevRenderer) {
              extensions.renderers[ext.name] = function(...args2) {
                let ret = ext.renderer.apply(this, args2);
                if (ret === false) {
                  ret = prevRenderer.apply(this, args2);
                }
                return ret;
              };
            } else {
              extensions.renderers[ext.name] = ext.renderer;
            }
          }
          if (ext.tokenizer) {
            if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
              throw new Error("extension level must be 'block' or 'inline'");
            }
            if (extensions[ext.level]) {
              extensions[ext.level].unshift(ext.tokenizer);
            } else {
              extensions[ext.level] = [ext.tokenizer];
            }
            if (ext.start) {
              if (ext.level === "block") {
                if (extensions.startBlock) {
                  extensions.startBlock.push(ext.start);
                } else {
                  extensions.startBlock = [ext.start];
                }
              } else if (ext.level === "inline") {
                if (extensions.startInline) {
                  extensions.startInline.push(ext.start);
                } else {
                  extensions.startInline = [ext.start];
                }
              }
            }
          }
          if (ext.childTokens) {
            extensions.childTokens[ext.name] = ext.childTokens;
          }
        });
      }
      if (pack.renderer) {
        const renderer = marked.defaults.renderer || new Renderer();
        for (const prop in pack.renderer) {
          const prevRenderer = renderer[prop];
          renderer[prop] = (...args2) => {
            let ret = pack.renderer[prop].apply(renderer, args2);
            if (ret === false) {
              ret = prevRenderer.apply(renderer, args2);
            }
            return ret;
          };
        }
        opts.renderer = renderer;
      }
      if (pack.tokenizer) {
        const tokenizer = marked.defaults.tokenizer || new Tokenizer();
        for (const prop in pack.tokenizer) {
          const prevTokenizer = tokenizer[prop];
          tokenizer[prop] = (...args2) => {
            let ret = pack.tokenizer[prop].apply(tokenizer, args2);
            if (ret === false) {
              ret = prevTokenizer.apply(tokenizer, args2);
            }
            return ret;
          };
        }
        opts.tokenizer = tokenizer;
      }
      if (pack.walkTokens) {
        const walkTokens2 = marked.defaults.walkTokens;
        opts.walkTokens = function(token) {
          pack.walkTokens.call(this, token);
          if (walkTokens2) {
            walkTokens2.call(this, token);
          }
        };
      }
      if (hasExtensions) {
        opts.extensions = extensions;
      }
      marked.setOptions(opts);
    });
  };
  marked.walkTokens = function(tokens, callback) {
    for (const token of tokens) {
      callback.call(marked, token);
      switch (token.type) {
        case "table": {
          for (const cell of token.header) {
            marked.walkTokens(cell.tokens, callback);
          }
          for (const row of token.rows) {
            for (const cell of row) {
              marked.walkTokens(cell.tokens, callback);
            }
          }
          break;
        }
        case "list": {
          marked.walkTokens(token.items, callback);
          break;
        }
        default: {
          if (marked.defaults.extensions && marked.defaults.extensions.childTokens && marked.defaults.extensions.childTokens[token.type]) {
            marked.defaults.extensions.childTokens[token.type].forEach(function(childTokens) {
              marked.walkTokens(token[childTokens], callback);
            });
          } else if (token.tokens) {
            marked.walkTokens(token.tokens, callback);
          }
        }
      }
    }
  };
  marked.parseInline = function(src, opt) {
    if (typeof src === "undefined" || src === null) {
      throw new Error("marked.parseInline(): input parameter is undefined or null");
    }
    if (typeof src !== "string") {
      throw new Error("marked.parseInline(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected");
    }
    opt = merge({}, marked.defaults, opt || {});
    checkSanitizeDeprecation(opt);
    try {
      const tokens = Lexer.lexInline(src, opt);
      if (opt.walkTokens) {
        marked.walkTokens(tokens, opt.walkTokens);
      }
      return Parser.parseInline(tokens, opt);
    } catch (e) {
      e.message += "\nPlease report this to https://github.com/markedjs/marked.";
      if (opt.silent) {
        return "<p>An error occurred:</p><pre>" + escape(e.message + "", true) + "</pre>";
      }
      throw e;
    }
  };
  marked.Parser = Parser;
  marked.parser = Parser.parse;
  marked.Renderer = Renderer;
  marked.TextRenderer = TextRenderer;
  marked.Lexer = Lexer;
  marked.lexer = Lexer.lex;
  marked.Tokenizer = Tokenizer;
  marked.Slugger = Slugger;
  marked.parse = marked;
  var options = marked.options;
  var setOptions = marked.setOptions;
  var use = marked.use;
  var walkTokens = marked.walkTokens;
  var parseInline = marked.parseInline;
  var parser = Parser.parse;
  var lexer = Lexer.lex;

  // source/docs/api/index.selek
  function API() {
    return [dabMain.createRawComponent(`div`, {
      content: "`                    `",
      parentComponent: "",
      positionComponent: "1509503310704501a050870890487700",
      state: {},
      event: {},
      attribute: {
        "class": "hero"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "1509503310704501a050870890487700",
      positionComponent: "42107343100040008275418872008005",
      state: {},
      event: {},
      attribute: {
        "class": "navbar"
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "42107343100040008275418872008005",
      positionComponent: "76970780603240808505700002040107",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    Home                `",
      parentComponent: "76970780603240808505700002040107",
      positionComponent: "10106018190046708204140090750710",
      state: {},
      event: {},
      attribute: {
        "href": "/",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "42107343100040008275418872008005",
      positionComponent: "30103040500040048059400000000308",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    Docs                `",
      parentComponent: "30103040500040048059400000000308",
      positionComponent: "50853180738641768596850060360000",
      state: {},
      event: {},
      attribute: {
        "href": "/docs",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "42107343100040008275418872008005",
      positionComponent: "10801904550040008625490590291400",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    API                `",
      parentComponent: "10801904550040008625490590291400",
      positionComponent: "0020000002044980a308910069046300",
      state: {},
      event: {},
      attribute: {
        "href": "/api",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                `",
      parentComponent: "1509503310704501a050870890487700",
      positionComponent: "78473008176141048078179508034086",
      state: {},
      event: {},
      attribute: {
        "class": "main-content"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`            `",
      parentComponent: "78473008176141048078179508034086",
      positionComponent: "19000205168848138900786807788854",
      state: {},
      event: {},
      attribute: {
        "class": "left showPanel"
      },
      id: "shortContent"
    }), dabMain.createRawComponent(`div`, {
      content: "`                            `",
      parentComponent: "78473008176141048078179508034086",
      positionComponent: "12008066770045609000390371028775",
      state: {},
      event: {},
      attribute: {
        "class": "right"
      },
      id: "allContent"
    })];
  }

  // source/docs/config/index.selek
  function Config() {
    return [dabMain.createRawComponent(`div`, {
      content: "`                    `",
      parentComponent: "",
      positionComponent: "10159006509440109070268005707297",
      state: {},
      event: {},
      attribute: {
        "class": "hero"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                            `",
      parentComponent: "10159006509440109070268005707297",
      positionComponent: "55902466400040098008110790700057",
      state: {},
      event: {},
      attribute: {
        "class": "navbar"
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "55902466400040098008110790700057",
      positionComponent: "10079224250043378210470300665404",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    Home                `",
      parentComponent: "10079224250043378210470300665404",
      positionComponent: "58050007300748008450500010600909",
      state: {},
      event: {},
      attribute: {
        "href": "/",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "55902466400040098008110790700057",
      positionComponent: "87837400190945228018199930080090",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    Docs                `",
      parentComponent: "87837400190945228018199930080090",
      positionComponent: "13264250541640208002909069500600",
      state: {},
      event: {},
      attribute: {
        "href": "/docs",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`li`, {
      content: "`                            `",
      parentComponent: "55902466400040098008110790700057",
      positionComponent: "90040030174040249200910006050037",
      state: {},
      event: {},
      attribute: {},
      id: ""
    }), dabMain.createRawComponent(`a`, {
      content: "`                    API                `",
      parentComponent: "90040030174040249200910006050037",
      positionComponent: "43051067750940248070151704910006",
      state: {},
      event: {},
      attribute: {
        "href": "/api",
        "data-link": ""
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`                                `",
      parentComponent: "10159006509440109070268005707297",
      positionComponent: "9070908810324491b303109558350755",
      state: {},
      event: {},
      attribute: {
        "class": "main-content"
      },
      id: ""
    }), dabMain.createRawComponent(`div`, {
      content: "`            `",
      parentComponent: "9070908810324491b303109558350755",
      positionComponent: "59010001601140509400100557646085",
      state: {},
      event: {},
      attribute: {
        "class": "left showPanel"
      },
      id: "shortContent"
    }), dabMain.createRawComponent(`div`, {
      content: "`                            `",
      parentComponent: "9070908810324491b303109558350755",
      positionComponent: "99060018170449008098100450300002",
      state: {},
      event: {},
      attribute: {
        "class": "right"
      },
      id: "allContent"
    })];
  }

  // source/md/introduce.md
  var introduce_default = '# # Hello From Seleku\r\nthis site create by seleku-kit and create by daberdev it self\r\n\r\n## # Apa itu seleku ?\r\nseleku adalah framework front end javascript yang berfokus kepada component dan pengembangan web3\r\nframework ini cukup simpel dan di tenagai oleh esbuild sebagai bundler nya\r\n\r\n## # kenapa seleku ?\r\nseleku memungkinkan anda untuk melakukan pembuatan component dari element html yang di tulis langsung\r\ndi dalam sintaks javascript dan beberapa fitur lainya yang memungkinkan anda melakukan development\r\nkhusus bagian frontend web, selain itu seleku di buat dengan sangat simpel dan seleku berjalan dengan dabcom library yang merupakan library utama dari seleku core system\r\n\r\n# # Getting Started\r\n## # instalasi dan requirement\r\nuntuk menggunakan seleku-kit ada terlebih dahulu harus telah memahami dasar dari web development seperti\r\n**html**,**css**,**javascript** dan pemahaman tentang node js dan npm (node package manager)\r\n\r\n#### setup node js\r\njika anda belum memiliki node js maka anda dapat mendownload di **[Download Node JS](https://nodejs.org)** setelah mendownload silahkan ikuti instruksi instalasi yang di berikan kemudian\r\nsilahkan lakukan pengecekan apakah node js telah terinstall di lokal komputer anda dengan mengetikan\r\n\r\n```bash\r\nnode --version\r\n```\r\n\r\njika node js telah terinstall maka anda dapat melihat versi dari node js yang telah di install, jika anda\r\ntelah menginstall node js maka anda juga akan secara otomatis menginstall npm (node package manager) yang akan kita gunakan untuk memanajement project seleku-kit maupun project javascript lainya\r\n\r\nuntuk melihat versi npm jalankan perintah :\r\n\r\n```bash\r\nnpm --version\r\n```\r\n\r\nkemudian untuk menginstall seleku template generator anda cukup menjalan kan perintah berikut\r\n\r\n```bash\r\nnpm i seleku-kit -g\r\n```\r\n\r\nmaka seleku akan di install secara global di komputer anda\r\n\r\n## # Membuat Project Pertama\r\nuntuk membuat project pertama silahkan jalan kan `seleku-kit` di terminal atau command prompt anda maka\r\nanda akan di minta untuk memilih template apa yang akan anda gunakan\r\nkemudian anda akan di minta untuk memasukan nama project baru yang akan anda buat\r\n\r\nsetelah anda membuat template project silahkan jalankan terminal atau command prompt anda di dalam folder\r\nproject yang telah anda buat dengan mengetikan `npm i` kemudian anda jalankan `npm run dev` untuk menjalankan seleku-kit di mode development dan anda akan melihat bahwa seleku berjalan di lokal komputer anda dengan port default bawaan\r\n\r\nsilahkan buka di web browser anda `localhost:3000` dan untuk melihat perubahan silahkan anda edit file\r\n`main.selek`\r\n\r\n# # Sintaks Dasar\r\nSeleku-kit memiliki sintaks yang merupakan gabungan dari HTML dan js sehingga bagi anda yang menggunakan react\r\nmaka anda akan merasa familiar dengan sintaks yang ada untuk memulai mari kita pahami susunan sintaks\r\n\r\n```jsx\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nRender(<h1>Hello World</h1>,document.body);\r\n\r\n```\r\n#### # Dasar - Dasar\r\n- pada bagian awal kita mengimport **dabMain** dan **Render**, \r\napa itu dab main?, **dabMain** merupakan suatu Object yang memuat semua method dan property yang akan di butuhkan untuk membuat suatu component, \r\nsedangkan **Render** merupakan fungsi yang bertugas untuk menampilkan component ke layar dengan cara memasukan component ke tag HTML yang di targetkan\r\n\r\n- pada baris ke 3 kita menggunakan fungsi **Render** dengan parameter pertama merupakan component yang akan di render dan parameter ke dua merupakan target atau tempat di rampilkan nya component\r\n\r\n## # Comment\r\nuntuk membuat komentar di dalam seleku cukup gunakan /**/ atau multi-line comment\r\nyang ada di javascript\r\n\r\n```jsx\r\n/*ini contoh komentar*/\r\n```\r\n\r\n## # Template Literal\r\nselek-kit menggunakan template literal bawaan javascript untuk menampilkan\r\nsuatu kontent text di dalam html\r\n\r\n##### contoh template literal\r\n```jsx\r\n\r\n    const seleku = "i am seleku-kit";\r\n\r\n    <h1> hello ${seleku}</h1>;\r\n\r\n```\r\n\r\n#### # function component\r\nseleku-kit memungkinkan anda untuk membuat component dari suatu fungsi sebagai berikut\r\n```jsx\r\n\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nfunction Welcome(){\r\n\r\n    return <h1>Welcome to seleku-kit!!</h1>;\r\n\r\n}\r\n\r\nRender(<Welcome><Welcome/>,document.body);\r\n\r\n```\r\n\r\nuntuk menerima argument dari function component lakukan sebagai berikut\r\n```jsx\r\n\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nfunction Welcome({username}){\r\n\r\n    return <h1 state="{{username}}">\r\n        Welcome to seleku-kit!! ${this.state.username}\r\n    </h1>;\r\n\r\n}\r\n\r\nRender(<Welcome username="\'Daberdev\'"><Welcome/>,document.body);\r\n\r\n```\r\n\r\nketika suatu function component menerima argument maka ketika component tersebut di panggil untuk memasukan argumen nya cukup lakukan sperti memasukan attribute di html biasa, untuk saat ini abaikan attribute state dan penggunaan template literal yang ada pada kode tersebut\r\n\r\n> pemberitahuan setiap attribute yang di miliki suatu component akan memiliki value yang di anggap javascript biasa oleh karena itu untuk memasukan suatu string ke dalam attribute gunakan `` atau \'\'\r\n\r\n\r\n## # Attribute Spesial\r\ncomponent di seleku memiliki atribut-atribut khusus maupun umum di antara nya sebagai berikut\r\n\r\n## # $toBeChild \r\nattribute **$toBeChild** merupakan attribute yang di gunakan di dalam parameter suatu funsi component\r\nattribute ini di gunakan untuk memberikan component yang ada di dalam function componentid dari parent component nya agar bisa di gunakan sebagai target untuk component yang ada di dalam function component di render\r\n\r\n```jsx\r\n\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nfunction Welcome({$toBeChild}){\r\n\r\n    return <h1>\r\n        Welcome to seleku-kit!! \r\n    </h1>;\r\n\r\n}\r\n\r\nRender(<div><Welcome username="\'Daberdev\'"><Welcome/></div>,document.body);\r\n\r\n```\r\n\r\n## # $beChild \r\nattribute **$beChild** merupakan attribute yang berpasangan dengan attribute **$toBeChild** jika **$toBeChild** hanya memberikan semua properti untuk di gunakan kepada component yang ada di dalam function component maka **$beChild** adalah attribute yang menerima semua properti tersebut untuk kemudian di gunakan oleh component di dalam function component me render\r\n\r\n```jsx\r\n\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nfunction Welcome({$toBeChild}){\r\n\r\n    return <h1 $beChild>\r\n        Welcome to seleku-kit!! \r\n    </h1>;\r\n\r\n}\r\n\r\nRender(<div><Welcome username="\'Daberdev\'"><Welcome/></div>,document.body);\r\n\r\n```\r\n\r\n## # $loopComponent \r\nattribute ini merupakan attribute yang hanya di miliki oleh component yang melakukan looping baik di dalam for loop maupun while bahkan array method sekalipun\r\n\r\n```jsx\r\n\r\nasync function AllContributor({$toBeChild}){\r\n\r\n    let loopingComponent = [];\r\n\r\n    const data = await (await fetch("https://api.github.com/repos/daberpro/dabcom/contributors")).json();\r\n\r\n    for (let x of data){\r\n\r\n        loopingComponent = [\r\n            ...loopingComponent,\r\n            ...<img \r\n            $loopComponent="x.node_id"\r\n            title="x.login" \r\n            src="x.avatar_url"/>];\r\n\r\n    }\r\n\r\n    return loopingComponent;\r\n\r\n}\r\n\r\n(async ()=> Render(<div><AllContributor $async></AllContributor></div>))();\r\n\r\n```\r\nattribute ini membutuhkan value yang merupakan id yang unik\r\n\r\n## # component:id\r\nini merupakan attribute yang berfungsi sebagai id dari suatu component\r\n> id yang di definiksan dengan id component berbeda dengan id dari HTML\r\n\r\n```jsx\r\n\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nconst card = <div component:id="example_id"></div>;\r\n\r\nRender(card,document.body);\r\n\r\n```\r\n\r\ndan perlu di ingat bahwa **component:id** hanya di miliki oleh component dari HTML bukan dari function\r\ncomponent\r\n\r\n## # state\r\nattribute ini merupakan attribute khusus dan hanya di miliki oleh component dari tag HTML dan bukan dari component function, attribute ini di gunakan untuk memasukan data dinamis yang dapat di ubah-ubah sesuai dengan kebutuhan anda dan untuk data yang di masukan harus dalam bentuk object {{}} kurung kurawal bagian luar merupakan kurung kurawal yang di gunakan untuk memberitahukan kepada kompiler bahwa kode yang terdapat di dalam kurung kurawal pertama akan di eksekusi di sisi kompiler terlebih dahulu agar tidak di anggap sebagai string oleh compiler\r\n\r\n```jsx\r\n\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nfunction Card(){\r\n\r\n    return  <div>\r\n                <h1>Hello</h1>\r\n                <p state="{{\r\n                    count: 0\r\n                }}">count ${this.state.count}</p>\r\n            </div>;\r\n\r\n}\r\n\r\nRender(<Card></Card>,document.body);\r\n\r\n```\r\n\r\nuntuk melakukan update pada state anda harus menggunakan fungsi **findById** yang terdapat di dalam dabcom perlu di ketahui bahwa fungsi **findById** adalah fungsi yang memutuhkan id dari suatu component\r\nid dari component berbeda dengan id dari HTML\r\n\r\n```jsx\r\n\r\nimport { dabMain, Render, findById } from "dabcom";\r\n\r\nfunction Card(){\r\n\r\n    return  <div>\r\n                <h1>Hello</h1>\r\n                <p component:id="counting" state="{{\r\n                    count: 0\r\n                }}">count ${this.state.count}</p>\r\n            </div>;\r\n\r\n}\r\n\r\nwindow.setInterval(()=>{\r\n\r\n    findById("counting").state.count++;\r\n\r\n},1000);\r\n\r\nRender(<Card></Card>,document.body);\r\n\r\n```\r\n\r\n## # on:\r\nattribute ini merupakan attribute spesial yang hanya di miliki oleh component dari tag HTML dan bukan dari function component, attribute ini di gunakan untuk membuat event pada component HTML yang di render dan untuk menggunakan cukup dengan `on:nama-event` contoh `on:click` dan untuk value dari attribute ini berupa function seperti berikut `on:click="{()=>{}}"` seleku-kit mengharuskan untuk menggunakan arrow function di dalam attribute on agar tidak terjadi error pada compiler di karena aturan kurung kurawal pertama seperti yang terdapat pada attribute state\r\n\r\n```jsx\r\n\r\nimport { dabMain, Render, findById } from "dabcom";\r\n\r\nfunction Card(){\r\n\r\n    return  <div>\r\n                <h1 on:click="{()=>{\r\n\r\n                    alert(\'hello world\');\r\n\r\n                }}">Hello</h1>\r\n            </div>;\r\n\r\n}\r\n\r\nRender(<Card></Card>,document.body);\r\n\r\n```\r\n\r\n## # $async\r\nattribute ini hanya di miliki oleh component function dan di gunakan untuk\r\nme render async component function dan parent atau component induk dari\r\nasync component function harus merupakan fungsi async\r\n\r\n### contoh\r\n\r\n```jsx\r\n\r\nasync function AllContributor({$toBeChild}){\r\n\r\n    let loopingComponent = [];\r\n\r\n    const data = await (await fetch("https://api.github.com/repos/daberpro/dabcom/contributors")).json();\r\n\r\n    for (let x of data){\r\n\r\n        loopingComponent = [\r\n            ...loopingComponent,\r\n            ...<img \r\n            $loopComponent="x.node_id"\r\n            title="x.login" \r\n            src="x.avatar_url"/>];\r\n\r\n    }\r\n\r\n    return loopingComponent;\r\n\r\n}\r\n\r\nconst App = async ()=>{\r\n    Render(<div><AllContributor $async></AllContributor></div>))();\r\n}\r\n\r\nApp();\r\n\r\n```\r\n\r\n# # Seleku Routing\r\nseleku-kit memiliki sistem routing menggunakan SPA (single page application) bawaan yang dapat anda gunakan\r\ndengan mudah untuk contoh kodenya sebagai berikut\r\n\r\n```jsx\r\nimport { dabMain, Render } from "dabcom";\r\nimport { Router } from "dabcom/spa/route.js";\r\n\r\nfunction Home(){\r\n\r\n    return <h1>Hello World!!</h1>;\r\n\r\n}\r\n\r\n<Router.route \r\n\r\n    path="\'/home\'"\r\n    component="<Home></Home>"\r\n    target="{()=>{\r\n        \r\n        return document.body;\r\n\r\n    }}"\r\n    onRender="{()=>{\r\n\r\n        console.log(\'your in home page\');\r\n\r\n    }}"\r\n\r\n></Router.route>;\r\n\r\n```\r\nberikut adalah penjelasan sintaks di atas \r\n- **Router.route** merupakan suatu fungsi yang di ambil dari dabcom library\r\n- argumen **path** merupakan argument yang di butuhkan oleh router untuk menentukan url bagi component untuk di render\r\n- argument **component** merupakan argument yang menerima component yang akan di render\r\n- argument **target** argument ini di gunakan untuk menerima element / component HTML yang akan menjadi tempat render\r\n- argument **onRender** yaitu argument yang menerima callback function ketika component di render\r\n\r\n## # mengirim data\r\nuntuk mengirimkan data ke dalam router anda cukup menggunakan attribute data\r\ndan untuk mengakses data yang di kirim cukup gunakan this di ikuti dengan nama property dari data yang di kirim\r\n```jsx\r\nimport { dabMain, Render } from "dabcom";\r\nimport { Router } from "dabcom/spa/route.js";\r\n\r\nfunction Home(){\r\n\r\n    return <h1>Hello ${this.user}!!</h1>;\r\n\r\n}\r\n\r\n<Router.route \r\n\r\n    path="\'/home\'"\r\n    component="<Home></Home>"\r\n    target="{()=>{\r\n        \r\n        return document.body;\r\n\r\n    }}"\r\n    onRender="{()=>{\r\n\r\n        console.log(\'your in home page\');\r\n\r\n    }}"\r\n\r\n    data = "{{\r\n        user: \'daber\'\r\n    }}"\r\n\r\n></Router.route>;\r\n\r\n```\r\nuntuk melakukan pemindahan url gunakan element a href di ikuti dengan attribute\r\n**data-link**\r\n\r\n```jsx\r\nimport { dabMain, Render } from "dabcom";\r\nimport { Router } from "dabcom/spa/route.js";\r\n\r\nfunction Home(){\r\n\r\n    return <h1>\r\n        Hello ${this.user}!!\r\n        <a href="\'/about\'" data-link>to About</a>\r\n    </h1>\r\n\r\n}\r\n\r\nfunction About(){\r\n\r\n    return <h1>\r\n        i create by seleku-kit\r\n        <a href="\'/home\'" data-link>to Home</a>\r\n    </h1>\r\n\r\n}\r\n\r\n<Router.route \r\n\r\n    path="\'/home\'"\r\n    component="<Home></Home>"\r\n    target="{()=>{\r\n        \r\n        return document.body;\r\n\r\n    }}"\r\n    onRender="{()=>{\r\n\r\n        console.log(\'your in home page\');\r\n\r\n    }}"\r\n\r\n    data = "{{\r\n        user: \'daber\'\r\n    }}"\r\n\r\n></Router.route>;\r\n\r\n<Router.route \r\n\r\n    path="\'/about\'"\r\n    component="<About></About>"\r\n    target="{()=>{\r\n        \r\n        return document.body;\r\n\r\n    }}"\r\n    onRender="{()=>{\r\n\r\n        console.log(\'your in home page\');\r\n\r\n    }}"\r\n></Router.route>;\r\n\r\n```\r\n\r\n# # Loop Component\r\nseleku juga memungkinkan anda untuk melakukan loop pada component pada bagian\r\nattribute **$loopComponent** anda telah melihat bahwa seleku-kit memiliki attribute tersebut yang harus di gunakan pada saat anda melakukan\r\nlooping pada component baik itu menggunakan for ataupun while bahkan \r\narray method sekalipun\r\n\r\n## # Loop example\r\nseleku-kit sebenarnya melakukan compile yaitu mentransformasi sintaks dari .selek\r\nke .js sehingga suatu component baik itu function component maupun HTML component\r\nakan di ubah menjadi sintaks javascript yang merupakan suatu array ataupun mengembalikan suatu array oleh karena itu ketika anda melakukan looping \r\ndi haruskan untuk mengurai array yang di bentuk oleh compiler kemudian di push\r\nke dalam array yang baru\r\n\r\n### # Contoh For Loop\r\n```jsx\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nconst allFruits = ["grape","apple","strawberry","pinapple"];\r\n\r\nfunction FruitsName(){\r\n\r\n    let newCompoonent = [];\r\n\r\n    for(let x in allFruits){\r\n        /*ingat anda harus mengisikan id yang unik untuk loop component*/\r\n        newComponent = [\r\n            ...newComponent,\r\n            ...<h1 $loopComponent="x" state="{{content: allFruits[x]}}">\r\n                ${this.state.content}\r\n               </h1>\r\n        ];\r\n\r\n    }\r\n\r\n    /*anda harus mengembalikan array dari component yang baru*/\r\n\r\n    return newComponent;\r\n\r\n}\r\n\r\n```\r\n\r\nuntuk contoh lainya anda dapat melakukan penerapan yang sama baik pada while maupun\r\narray method\r\n\r\n# # Render\r\nsejauh ini kita sering melihat fungsi **Render** di hampir setiap contoh kode\r\ndan telah di jelaskan di beberapa sub-docs bahwa fungsi ini merupakan fungsi\r\nyang di tugaskan untuk me render tetapi apakah hanya untuk me render static?, tentu tidak fungsi ini juga dapat melakukan update render dan melakukan pengiriman\r\ndata ke dalam component yang di render\r\n\r\n### Contoh Kode\r\n\r\n## # Render Update\r\n\r\n```jsx\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nfunction SayHello({gender}){\r\n\r\n    if(gender === "male"){\r\n\r\n        return <h1>Hello mr</h1>\r\n\r\n    }\r\n\r\n    if(gender === "female"){\r\n\r\n        return <h1>Hello mrs</h1>\r\n\r\n    }\r\n\r\n}\r\n\r\nconst say = Render(<SayHello gender="\'male\'"></SayHello>,document.body);\r\n\r\nsay.updateComponentProperty(SayHello,{\r\n    gender: "female"\r\n});\r\n\r\n```\r\nfungsi **Render** akan mengembalikan suatu fungsi **updateComponentProperty** di mana\r\nfungsi ini akan melakukan update terhadap render dengan properti yang di terima\r\nuntuk parameter pertama pada fungsi ini yaitu component function dan paramter ke 2\r\nmerupakan properti yang akan anda update\r\n\r\n## # Embbed Data\r\n\r\nseperti yang telah di beritahukan bahwa fungsi **Render** dapat melakukan pengiriman data yang akan di embbed ke dalam component dan untuk mengakses nya\r\ncukup gunakan this di ikuti dengan nama property yang di embbed\r\n\r\n```jsx\r\nimport { dabMain, Render } from "dabcom";\r\n\r\nfunction SayHello({gender}){\r\n\r\n    if(gender === "male"){\r\n\r\n        return <h1>Hello mr ${this.username}</h1>\r\n\r\n    }\r\n\r\n    if(gender === "female"){\r\n\r\n        return <h1>Hello mrs ${this.username}</h1>\r\n\r\n    }\r\n\r\n}\r\n\r\nconst say = Render(<SayHello gender="\'male\'"></SayHello>,\r\n            document.body,\r\n            {\r\n                username: "`nanda`"\r\n            });\r\n\r\nsay.updateComponentProperty(SayHello,{\r\n    gender: "female"\r\n});\r\n\r\n```\r\ntapi perlu di ingat bahwa embbed data ini merupakan data statis bukan data dinamis\r\n\r\n# # Whats Next ?\r\nuntuk saat ini seleku masih dalam tahap pengembangan dan akan terus di lakukan\r\nupdate untuk selanjutnya seleku akan memiliki fitur web3 yang saat ini sedang di development ';

  // source/md/api.md
  var api_default = "# All API\r\n## # Render\r\n**`Render : Function`**\r\n\r\n```ts\r\nRender(component: Component, target: HTMLElement, embbedData: Object)\r\n```\r\n\r\n|Argument | Description |\r\n|:--------|:-----------|\r\n|component|komponent yang akan di render bisa berupa component function atau component HTML|\r\n|target| HTMLElement yang akan menjadi tempat di render nya component|\r\n|embbedData| merupakan data bertipe object yang akan di masukan ke dalam component|\r\n\r\n| Method      | Description |\r\n| :----------- | :----------- |\r\n| updateComponentProperty| melakukan update pada component yang di render |\r\n```ts\r\nRender(component: Component, target: HTMLElement, embbedData: Object).updateComponentProperty(componentFunction: ComponentFunctiom,data: Object);\r\n```\r\n\r\n## # findById\r\n**`findById : Function`**\r\n\r\n```ts\r\nfindById(componentId: String)\r\n```\r\n\r\n|Argument | Description |\r\n|:--------|:-----------|\r\n|componentId|component:id dari suatu component|\r\n\r\n## # Router\r\n**`Router : Object`**\r\n\r\n```ts\r\nRouter\r\n```\r\n\r\n| Method      | Description |\r\n| :----------- | :----------- |\r\n| route| melakukan routing|\r\n\r\n```ts\r\nRouter.route(Object: {path: String,target: Function,component: Component,data: Object})\r\n```";

  // source/md/config.md
  var config_default = "# Config\r\nseleku menggunakan esbuild sebagai bundler nya untuk melakukan config maka\r\nanda cukup melakukan pengautran pada file `esbuild.config.json` atau `build.config.json` untuk mendapatkan configurasi silahkan kunjungi web resmi esbuild\r\n**[Esbuild Config](https://esbuild.github.io/getting-started/)**";

  // source/main.selek
  async function main() {
    Router.route({
      "path": "/",
      "component": await Home({}),
      "target": () => {
        return document.body;
      }
    });
  }
  main();
  Router.route({
    "path": "/docs",
    "component": Docs({}),
    "target": () => {
      return document.body;
    },
    "data": {
      "nama": `daberdev`
    }
  });
  async function allDocsEvent(content) {
    const allDocsContent = findById("allContent").element;
    const shortContent = findById("shortContent").element;
    let indexOfContent = 1;
    if (allDocsContent instanceof HTMLElement) {
      let findPosition = function(obj) {
        var currenttop = 0;
        if (obj.offsetParent) {
          do {
            currenttop += obj.offsetTop;
          } while (obj = obj.offsetParent);
          return [currenttop];
        }
      };
      allDocsContent.innerHTML = marked.parse(content);
      let allChild = [...allDocsContent.children];
      allChild = allChild.filter((e) => e.nodeName.toLowerCase() === "h1" || e.nodeName.toLowerCase() === "h2" || e.nodeName.toLowerCase() === "h4").map((e) => ({
        content: e.textContent,
        size: (() => {
          if (e.nodeName.toLowerCase() === "h1") {
            return 1.5;
          }
          if (e.nodeName.toLowerCase() === "h2") {
            return 1;
          }
          if (e.nodeName.toLowerCase() === "h4") {
            return 0.8;
          }
        })(),
        component: e.getClientRects()[0]
      }));
      for (let x in allChild) {
        Render([dabMain.createRawComponent(`button`, {
          content: "`${this.state.text}`",
          parentComponent: "",
          positionComponent: "50003631120045278040505031300009",
          state: {
            text: allChild[x].content
          },
          event: {
            onclick: (e) => {
              shortContent.classList.toggle("showPanel");
              allDocsContent.scrollTo(0, allChild[x].component.top);
            }
          },
          attribute: {
            "style": "font-size: " + allChild[x].size + "rem;padding-left: " + Math.abs((1.5 - allChild[x].size) * 20) + "px;"
          },
          id: ""
        })], shortContent);
      }
    }
    hljs.highlightAll();
    let options2 = {
      contentSelector: ".hero",
      copyIconClass: "fas fa-copy",
      checkIconClass: "fas fa-check text-success"
    };
    window.highlightJsBadge(options2);
    Render([dabMain.createRawComponent(`button`, {
      content: "``",
      parentComponent: "",
      positionComponent: "50703000902340339600109900032909",
      state: {},
      event: {
        onclick: () => {
          shortContent.classList.toggle("showPanel");
        }
      },
      attribute: {
        "class": "panel-btn"
      },
      id: ""
    }), dabMain.createRawComponent(`i`, {
      content: "``",
      parentComponent: "50703000902340339600109900032909",
      positionComponent: "97015007114840589300611300021700",
      state: {},
      event: {},
      attribute: {
        "class": "fas fa-bars"
      },
      id: ""
    })], allDocsContent);
  }
  Router.route({
    "path": "/docs/syntax",
    "component": allDocs({}),
    "target": () => {
      return document.body;
    },
    "onrender": async () => allDocsEvent(introduce_default)
  });
  Router.route({
    "path": "/api",
    "component": API({}),
    "target": () => {
      return document.body;
    },
    "onrender": async () => allDocsEvent(api_default)
  });
  Router.route({
    "path": "/docs/config",
    "component": Config({}),
    "target": () => {
      return document.body;
    },
    "onrender": async () => allDocsEvent(config_default)
  });
})();
