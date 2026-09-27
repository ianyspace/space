/**
 * 消息队列领域术语库（Kafka、RocketMQ、RabbitMQ 与高并发消息中间件）
 *
 * 规范（来自 content/AGENTS.md）：
 * 1. 只收录「正文自己没有专节展开、但读者理解需要的一句话概念」；
 * 2. def 是 1~2 句核心定义，more 是可展开的背景；
 * 3. 字段内容纯文本渲染，不要写 Markdown 标记（没有解析器，会原样显示 **foo**）；
 * 4. key 统一小驼峰 / 常用大小写，查找时会自动去空格转小写。
 */

export default {
    kraft: {
        term: 'KRaft',
        def: 'Kafka 在 2.8+ 引入的基于 Raft 协议的内置共识机制，用来彻底替代外部 ZooKeeper 集群。',
        more: '元数据直接保存在 Kafka 内部专属的分区里，简化了集群架构与运维成本。',
    },
    nameserver: {
        term: 'NameServer',
        def: 'RocketMQ 专用的轻量级路由与元数据发现服务。',
        more: '每个节点彼此无状态、不相互通信，Broker 定期向所有 NameServer 注册路由信息。',
    },
    erlang: {
        term: 'Erlang',
        def: '一种专为高并发、高容错、分布式实时系统设计的函数式编程语言。',
        more: 'RabbitMQ 底层基于它开发，因此带来了极低的微秒级延迟，但二次开发门槛较高。',
    },
    pageCache: {
        term: 'Page Cache',
        def: '操作系统内核在物理内存中为磁盘文件分配的缓存页。',
        more: 'Kafka 将消息追加写入时直接写进该缓存，大幅减少了实际物理磁盘的同步 IO 开销。',
    },
    zeroCopy: {
        term: '零拷贝',
        def: '数据无需在操作系统内核态缓冲区与应用程序用户态缓冲区之间往返拷贝的技术。',
        more: 'Kafka 在消费时通过 Linux 的 sendfile 系统调用直接把磁盘缓存推给网卡，极大地提升了网络吞吐。',
    },
    rebalance: {
        term: 'Rebalance',
        def: '消费者组内发生消费者增减或分区变更时，重新分配分区消费权限的过程。',
        more: '再平衡期间通常会短暂暂停消费，若未提交 offset 容易引起小范围的重复消费。',
    },
    deadLetterQueue: {
        term: '死信队列',
        def: '专门用于存放经过多次重试后仍然无法被成功消费的消息的特殊队列。',
        more: '防止故障消息无限阻塞正常业务流，便于运维或人工后续排查和兜底重试。',
    },
    setnx: {
        term: 'SETNX',
        def: 'Redis 的原生命令，仅当指定键不存在时才设置值。',
        more: '在消息幂等消费中常用来做低延迟去重记录，现通常使用 SET key val NX EX 一步保证原子性。',
    },
};
