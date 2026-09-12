import MqDeliveryDemo from './MqDeliveryDemo';
import MqPartitionDemo from './MqPartitionDemo';
import MqReliabilityDemo from './MqReliabilityDemo';
import MqRolesDemo from './MqRolesDemo';

/**
 * MDX components used by *this* article only.
 *
 * Every key is a tag that can be written directly in `index.mdx` / `index.en.mdx`
 * of this folder, eg. `<mq-roles-demo caption="MQ 的三大作用"></mq-roles-demo>`.
 *
 * `scripts/gen-article-registry.js` imports this file and wires it to the article
 * folder name, so no other file has to be touched when adding a component here.
 *
 * All four widgets share `Mq.module.scss` — they are one family of diagrams, and
 * a single stylesheet keeps their palette and dark-mode handling in sync.
 */
export default {
    'mq-roles-demo': MqRolesDemo,
    'mq-delivery-demo': MqDeliveryDemo,
    'mq-reliability-demo': MqReliabilityDemo,
    'mq-partition-demo': MqPartitionDemo,
};
