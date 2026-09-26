/**
 * Spring / MyBatis 领域的术语库。
 *
 * 每一条对应正文里一个 `<term>…</term>`：`def` 是必填的一句话解释，`more` 是可选的
 * 一行补充。两者都只当纯文本渲染（不走 markdown），所以别写反引号或星号。
 *
 * key 只要求「读起来是这个词」，大小写和空格由 `content/glossary/index.js` 归一化，
 * 所以这里写 `'CGLib'`、正文写 `<term>cglib</term>` 也能对上。
 *
 * 收录标准：**正文自己没解释过的词**。文章里有专节、有就地一句说明、或者在表格里
 * 给了做法和优缺点的，一律不进这张表 —— 否则读者点开看到的还是刚读过的内容。
 * 同理只出现在表格或代码块里的词也不收：那些位置按规矩不能标，收了也没处显示。
 */
const spring = {
    Bean: {
        def: '被 Spring 容器创建、组装、管理的对象，是 IoC 容器里的基本单元。',
        more: '类上加 @Component、或在配置类里用 @Bean 返回一个实例，这个对象就交给容器托管了；什么时候创建、注入什么、什么时候销毁，全由容器说了算。',
    },
    BeanPostProcessor: {
        def: 'Spring 留的扩展点：在每个 Bean 初始化前后插入自定义处理，甚至可以替换掉这个 Bean。',
        more: 'AOP 就挂在这里 —— postProcessAfterInitialization 把原始对象换成代理对象返回，容器里最终放的是代理。',
    },
    ObjectFactory: {
        def: '包装了「怎么拿到某个 Bean 引用」的工厂对象，调用 getObject() 才真正产出引用。',
        more: '三级缓存存的就是它：先把工厂放进去，等真有别的 Bean 需要时才调用，代理对象因此可以推迟到那一刻再生成。',
    },
    Servlet: {
        def: 'Java Web 的服务器端组件规范，规定了一个组件怎么接收 HTTP 请求、返回响应。',
        more: 'Tomcat 这类 Web 容器按规范调用它；Spring MVC 的 DispatcherServlet 本身就是一个 Servlet，把请求统一收进来再分发给 Controller。',
    },
    CGLib: {
        def: '一个在运行时生成字节码、动态创建子类的代码生成库。',
        more: 'Spring AOP 用它给没实现接口的目标类做代理：生成子类并重写方法，在方法里插入切面逻辑。底层靠 ASM 写字节码，所以 final 类和方法代理不了。',
    },
    SqlSession: {
        def: 'MyBatis 里代表一次数据库会话的顶层 API，执行 SQL、获取 Mapper 都经过它。',
        more: '它不是线程安全的，用法是「一个请求一个 SqlSession」，用完就关；内部把活交给 Executor 去执行，一级缓存也挂在它身上。',
    },
    Executor: {
        def: 'MyBatis 真正执行 SQL 的执行器，负责拼装 SQL、设置参数、执行并处理结果映射。',
        more: '分页插件 PageHelper 就是拦截它的 query 方法，在执行前往原始 SQL 上拼 LIMIT 实现的。',
    },
};

export default spring;
